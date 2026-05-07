import { UserSkill } from '../skills/entities/user-skill.entity';
import { ProficiencyLevel, SkillType } from '../skills/enums/skill.enums';
import { SkillOverlapItem } from './entities/match.entity';

const PROFICIENCY_WEIGHT: Record<ProficiencyLevel, number> = {
  [ProficiencyLevel.BEGINNER]: 0,
  [ProficiencyLevel.INTERMEDIATE]: 1,
  [ProficiencyLevel.ADVANCED]: 2,
  [ProficiencyLevel.EXPERT]: 3,
};

type Pair = {
  teacher: UserSkill;
  learner: UserSkill;
};

const findPairs = (teacherSkills: UserSkill[], learnerSkills: UserSkill[]) =>
  teacherSkills.flatMap((teacher) =>
    learnerSkills
      .filter((learner) => learner.skillId === teacher.skillId)
      .map((learner) => ({ teacher, learner })),
  );

const toOverlapItem = (pair: Pair): SkillOverlapItem => ({
  skillId: pair.teacher.skillId,
  skillName: pair.teacher.skill?.name ?? 'Unknown skill',
  proficiency: pair.teacher.proficiency,
});

export function computeCompatibilityScore(
  userASkills: UserSkill[],
  userBSkills: UserSkill[],
): {
  score: number;
  canTeachMe: SkillOverlapItem[];
  canLearnFromMe: SkillOverlapItem[];
} {
  const aTeach = userASkills.filter((skill) => skill.type === SkillType.TEACH);
  const aLearn = userASkills.filter((skill) => skill.type === SkillType.LEARN);
  const bTeach = userBSkills.filter((skill) => skill.type === SkillType.TEACH);
  const bLearn = userBSkills.filter((skill) => skill.type === SkillType.LEARN);

  const aTeachesB = findPairs(aTeach, bLearn);
  const bTeachesA = findPairs(bTeach, aLearn);
  const pairs = [...aTeachesB, ...bTeachesA];
  const maxPossiblePairs = Math.min(userASkills.length, userBSkills.length);

  if (pairs.length === 0 || maxPossiblePairs === 0) {
    return { score: 0, canTeachMe: [], canLearnFromMe: [] };
  }

  const skillOverlapScore = (pairs.length / maxPossiblePairs) * 50;
  const averageCloseness =
    pairs.reduce((total, pair) => {
      const teacherLevel = PROFICIENCY_WEIGHT[pair.teacher.proficiency];
      const learnerLevel = PROFICIENCY_WEIGHT[pair.learner.proficiency];
      return total + (1 - Math.abs(teacherLevel - learnerLevel) / 3);
    }, 0) / pairs.length;
  const proficiencyScore = averageCloseness * 30;
  const mutualBonus = aTeachesB.length > 0 && bTeachesA.length > 0 ? 20 : 0;
  const score = Math.max(
    0,
    Math.min(100, Math.round(skillOverlapScore + proficiencyScore + mutualBonus)),
  );

  return {
    score,
    canTeachMe: bTeachesA.map(toOverlapItem),
    canLearnFromMe: aTeachesB.map(toOverlapItem),
  };
}
