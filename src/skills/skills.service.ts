import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CreateUserSkillDto } from './dto/create-user-skill.dto';
import { ReviewSuggestionDto } from './dto/review-suggestion.dto';
import { SkillQueryDto, SkillSort } from './dto/skill-query.dto';
import { SuggestSkillDto } from './dto/suggest-skill.dto';
import { UpdateUserSkillDto } from './dto/update-user-skill.dto';
import { SkillSuggestion } from './entities/skill-suggestion.entity';
import { Skill } from './entities/skill.entity';
import { UserSkill } from './entities/user-skill.entity';
import {
  SkillCategory,
  SkillType,
  SuggestionStatus,
} from './enums/skill.enums';

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  [SkillCategory.FRONTEND]: 'Frontend',
  [SkillCategory.BACKEND]: 'Backend',
  [SkillCategory.DEVOPS]: 'DevOps',
  [SkillCategory.DATA_SCIENCE]: 'Data Science',
  [SkillCategory.MOBILE]: 'Mobile',
  [SkillCategory.DESIGN]: 'Design',
  [SkillCategory.DATABASE]: 'Database',
  [SkillCategory.CLOUD]: 'Cloud',
  [SkillCategory.SECURITY]: 'Security',
  [SkillCategory.AI_ML]: 'AI/ML',
};

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillsRepository: Repository<Skill>,
    @InjectRepository(UserSkill)
    private readonly userSkillsRepository: Repository<UserSkill>,
    @InjectRepository(SkillSuggestion)
    private readonly suggestionsRepository: Repository<SkillSuggestion>,
  ) {}

  async findAll(query: SkillQueryDto) {
    const limit = query.limit ?? 20;
    const queryBuilder = this.skillsRepository.createQueryBuilder('skill');

    if (query.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where(`skill."searchVector" @@ plainto_tsquery('english', :search)`, {
            search: query.search,
          }).orWhere('skill.name ILIKE :likeSearch', {
            likeSearch: `%${query.search}%`,
          });
        }),
      );
    }

    if (query.category) {
      queryBuilder.andWhere('skill.category = :category', {
        category: query.category,
      });
    }

    if (query.type || query.proficiency) {
      queryBuilder.innerJoin('skill.userSkills', 'filteredUserSkill');
      if (query.type) {
        queryBuilder.andWhere('filteredUserSkill.type = :type', {
          type: query.type,
        });
      }
      if (query.proficiency) {
        queryBuilder.andWhere(
          'filteredUserSkill.proficiency = :proficiency',
          { proficiency: query.proficiency },
        );
      }
    }

    const totalCount = await queryBuilder.clone().getCount();

    if (query.cursor) {
      const cursorSkill = await this.skillsRepository.findOne({
        where: { id: query.cursor },
      });
      if (cursorSkill) {
        if (query.sort === SkillSort.NEWEST) {
          queryBuilder.andWhere(
            '(skill."createdAt" < :cursorCreatedAt OR (skill."createdAt" = :cursorCreatedAt AND skill.id > :cursorId))',
            { cursorCreatedAt: cursorSkill.createdAt, cursorId: cursorSkill.id },
          );
        } else {
          const cursorPopularity =
            cursorSkill.teacherCount + cursorSkill.learnerCount;
          queryBuilder.andWhere(
            '((skill."teacherCount" + skill."learnerCount") < :cursorPopularity OR ((skill."teacherCount" + skill."learnerCount") = :cursorPopularity AND skill.id > :cursorId))',
            { cursorPopularity, cursorId: cursorSkill.id },
          );
        }
      }
    }

    if (query.sort === SkillSort.NEWEST) {
      queryBuilder
        .orderBy('skill.createdAt', 'DESC')
        .addOrderBy('skill.id', 'ASC');
    } else {
      queryBuilder
        .orderBy('(skill.teacherCount + skill.learnerCount)', 'DESC')
        .addOrderBy('skill.id', 'ASC');
    }

    const items = await queryBuilder.take(limit + 1).getMany();
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;

    return {
      items: pageItems,
      nextCursor: hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null,
      totalCount,
    };
  }

  async findOne(id: string) {
    const skill = await this.skillsRepository.findOne({
      where: { id },
      relations: { userSkills: { user: true } },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    const toUser = (userSkill: UserSkill) => ({
      userId: userSkill.userId,
      username: userSkill.user.username,
      displayName: userSkill.user.displayName,
      avatarUrl: userSkill.user.avatarUrl,
      proficiency: userSkill.proficiency,
    });

    const teachers = skill.userSkills
      .filter((userSkill) => userSkill.type === SkillType.TEACH)
      .map(toUser);
    const learners = skill.userSkills
      .filter((userSkill) => userSkill.type === SkillType.LEARN)
      .map(toUser);

    const { userSkills, ...skillData } = skill;
    void userSkills;
    return { ...skillData, teachers, learners };
  }

  async autocomplete(q: string, limit = 10) {
    if (q.trim().length < 2) {
      return [];
    }

    return this.skillsRepository
      .createQueryBuilder('skill')
      .select(['skill.id', 'skill.name', 'skill.category'])
      .where('skill.name ILIKE :query', { query: `%${q.trim()}%` })
      .orderBy('skill.name', 'ASC')
      .take(Math.min(limit, 20))
      .getMany();
  }

  async getCategories() {
    const counts = await this.skillsRepository
      .createQueryBuilder('skill')
      .select('skill.category', 'name')
      .addSelect('COUNT(skill.id)', 'skillCount')
      .groupBy('skill.category')
      .getRawMany<{ name: SkillCategory; skillCount: string }>();

    const countMap = new Map(
      counts.map((item) => [item.name, Number(item.skillCount)]),
    );

    return Object.values(SkillCategory).map((name) => ({
      name,
      label: CATEGORY_LABELS[name],
      skillCount: countMap.get(name) ?? 0,
    }));
  }

  createSuggestion(dto: SuggestSkillDto, userId: string) {
    const suggestion = this.suggestionsRepository.create({
      ...dto,
      suggestedById: userId,
      status: SuggestionStatus.PENDING,
    });
    return this.suggestionsRepository.save(suggestion);
  }

  async reviewSuggestion(id: string, dto: ReviewSuggestionDto) {
    const suggestion = await this.suggestionsRepository.findOne({
      where: { id },
    });
    if (!suggestion) {
      throw new NotFoundException('Skill suggestion not found');
    }

    if (
      dto.status === SuggestionStatus.APPROVED &&
      suggestion.status !== SuggestionStatus.APPROVED
    ) {
      const duplicate = await this.skillsRepository
        .createQueryBuilder('skill')
        .where('LOWER(skill.name) = LOWER(:name)', { name: suggestion.name })
        .getOne();

      if (!duplicate) {
        await this.skillsRepository.save(
          this.skillsRepository.create({
            name: suggestion.name,
            category: suggestion.category,
            description: null,
            iconUrl: null,
          }),
        );
      }
    }

    suggestion.status = dto.status;
    suggestion.reviewedAt = new Date();
    return this.suggestionsRepository.save(suggestion);
  }

  async incrementCount(skillId: string, type: SkillType) {
    await this.updateCount(skillId, type, 1);
  }

  async decrementCount(skillId: string, type: SkillType) {
    await this.updateCount(skillId, type, -1);
  }

  async getUserSkills(userId: string) {
    return this.userSkillsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async addUserSkill(userId: string, dto: CreateUserSkillDto) {
    const skill = await this.skillsRepository.findOne({
      where: { id: dto.skillId },
    });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    const existing = await this.userSkillsRepository.findOne({
      where: { userId, skillId: dto.skillId, type: dto.type },
    });
    if (existing) {
      throw new ConflictException(`You already have this skill as ${dto.type}`);
    }

    const userSkill = await this.userSkillsRepository.save(
      this.userSkillsRepository.create({ ...dto, userId }),
    );
    await this.incrementCount(dto.skillId, dto.type);

    return this.userSkillsRepository.findOneOrFail({
      where: { id: userSkill.id },
    });
  }

  async updateUserSkill(
    userId: string,
    userSkillId: string,
    dto: UpdateUserSkillDto,
  ) {
    const userSkill = await this.userSkillsRepository.findOne({
      where: { id: userSkillId, userId },
    });
    if (!userSkill) {
      throw new NotFoundException('User skill not found');
    }

    if (dto.type && dto.type !== userSkill.type) {
      const existing = await this.userSkillsRepository.findOne({
        where: { userId, skillId: userSkill.skillId, type: dto.type },
      });
      if (existing) {
        throw new ConflictException(`You already have this skill as ${dto.type}`);
      }

      await this.decrementCount(userSkill.skillId, userSkill.type);
      await this.incrementCount(userSkill.skillId, dto.type);
      userSkill.type = dto.type;
    }

    if (dto.proficiency) {
      userSkill.proficiency = dto.proficiency;
    }

    await this.userSkillsRepository.save(userSkill);
    return this.userSkillsRepository.findOneOrFail({
      where: { id: userSkill.id },
    });
  }

  async removeUserSkill(userId: string, userSkillId: string) {
    const userSkill = await this.userSkillsRepository.findOne({
      where: { id: userSkillId, userId },
    });
    if (!userSkill) {
      throw new NotFoundException('User skill not found');
    }

    await this.userSkillsRepository.remove(userSkill);
    await this.decrementCount(userSkill.skillId, userSkill.type);
  }

  private async updateCount(skillId: string, type: SkillType, amount: number) {
    const column =
      type === SkillType.TEACH ? 'teacherCount' : 'learnerCount';
    await this.skillsRepository
      .createQueryBuilder()
      .update(Skill)
      .set({ [column]: () => `GREATEST("${column}" + ${amount}, 0)` })
      .where('id = :skillId', { skillId })
      .execute();
  }
}
