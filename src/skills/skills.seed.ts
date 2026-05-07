import { DataSource } from 'typeorm';
import { Skill } from './entities/skill.entity';
import { SkillCategory } from './enums/skill.enums';

const skills: Array<Pick<Skill, 'name' | 'category' | 'description' | 'iconUrl'>> = [
  { name: 'React', category: SkillCategory.FRONTEND, description: 'Build component-based user interfaces.', iconUrl: null },
  { name: 'Angular', category: SkillCategory.FRONTEND, description: 'Develop structured frontend applications.', iconUrl: null },
  { name: 'Vue.js', category: SkillCategory.FRONTEND, description: 'Create approachable reactive interfaces.', iconUrl: null },
  { name: 'HTML/CSS', category: SkillCategory.FRONTEND, description: 'Structure and style web pages.', iconUrl: null },
  { name: 'TypeScript', category: SkillCategory.FRONTEND, description: 'Write typed JavaScript applications.', iconUrl: null },
  { name: 'Node.js', category: SkillCategory.BACKEND, description: 'Build server-side JavaScript services.', iconUrl: null },
  { name: 'Python', category: SkillCategory.BACKEND, description: 'Develop APIs, automation, and backend systems.', iconUrl: null },
  { name: 'Java', category: SkillCategory.BACKEND, description: 'Create enterprise backend applications.', iconUrl: null },
  { name: 'Go', category: SkillCategory.BACKEND, description: 'Build fast and reliable services.', iconUrl: null },
  { name: 'C#', category: SkillCategory.BACKEND, description: 'Develop .NET backend applications.', iconUrl: null },
  { name: 'Docker', category: SkillCategory.DEVOPS, description: 'Package applications into containers.', iconUrl: null },
  { name: 'Kubernetes', category: SkillCategory.DEVOPS, description: 'Orchestrate containerized workloads.', iconUrl: null },
  { name: 'CI/CD', category: SkillCategory.DEVOPS, description: 'Automate build, test, and release pipelines.', iconUrl: null },
  { name: 'Terraform', category: SkillCategory.DEVOPS, description: 'Manage infrastructure as code.', iconUrl: null },
  { name: 'Ansible', category: SkillCategory.DEVOPS, description: 'Automate server configuration.', iconUrl: null },
  { name: 'Pandas', category: SkillCategory.DATA_SCIENCE, description: 'Analyze tabular data in Python.', iconUrl: null },
  { name: 'NumPy', category: SkillCategory.DATA_SCIENCE, description: 'Perform numerical computing.', iconUrl: null },
  { name: 'Data Visualization', category: SkillCategory.DATA_SCIENCE, description: 'Communicate insights with charts.', iconUrl: null },
  { name: 'SQL Analytics', category: SkillCategory.DATA_SCIENCE, description: 'Explore data with SQL queries.', iconUrl: null },
  { name: 'Statistics', category: SkillCategory.DATA_SCIENCE, description: 'Reason about data and uncertainty.', iconUrl: null },
  { name: 'React Native', category: SkillCategory.MOBILE, description: 'Build cross-platform mobile apps.', iconUrl: null },
  { name: 'Flutter', category: SkillCategory.MOBILE, description: 'Create native-feeling apps with Dart.', iconUrl: null },
  { name: 'SwiftUI', category: SkillCategory.MOBILE, description: 'Build iOS interfaces.', iconUrl: null },
  { name: 'Kotlin Android', category: SkillCategory.MOBILE, description: 'Develop Android applications.', iconUrl: null },
  { name: 'Mobile UX', category: SkillCategory.MOBILE, description: 'Design touch-first mobile flows.', iconUrl: null },
  { name: 'Figma', category: SkillCategory.DESIGN, description: 'Design and prototype digital products.', iconUrl: null },
  { name: 'UI Design', category: SkillCategory.DESIGN, description: 'Create polished user interfaces.', iconUrl: null },
  { name: 'UX Research', category: SkillCategory.DESIGN, description: 'Understand user needs through research.', iconUrl: null },
  { name: 'Design Systems', category: SkillCategory.DESIGN, description: 'Create reusable interface standards.', iconUrl: null },
  { name: 'Product Design', category: SkillCategory.DESIGN, description: 'Shape end-to-end product experiences.', iconUrl: null },
  { name: 'PostgreSQL', category: SkillCategory.DATABASE, description: 'Design and query relational databases.', iconUrl: null },
  { name: 'MongoDB', category: SkillCategory.DATABASE, description: 'Model document databases.', iconUrl: null },
  { name: 'Redis', category: SkillCategory.DATABASE, description: 'Use in-memory data structures.', iconUrl: null },
  { name: 'Database Design', category: SkillCategory.DATABASE, description: 'Plan schemas and relationships.', iconUrl: null },
  { name: 'Query Optimization', category: SkillCategory.DATABASE, description: 'Tune database performance.', iconUrl: null },
  { name: 'AWS', category: SkillCategory.CLOUD, description: 'Build with Amazon Web Services.', iconUrl: null },
  { name: 'Azure', category: SkillCategory.CLOUD, description: 'Deploy with Microsoft Azure.', iconUrl: null },
  { name: 'Google Cloud', category: SkillCategory.CLOUD, description: 'Use Google Cloud Platform services.', iconUrl: null },
  { name: 'Serverless', category: SkillCategory.CLOUD, description: 'Build event-driven cloud functions.', iconUrl: null },
  { name: 'Cloud Architecture', category: SkillCategory.CLOUD, description: 'Design scalable cloud systems.', iconUrl: null },
  { name: 'OWASP Top 10', category: SkillCategory.SECURITY, description: 'Understand common web vulnerabilities.', iconUrl: null },
  { name: 'Penetration Testing', category: SkillCategory.SECURITY, description: 'Assess systems for security weaknesses.', iconUrl: null },
  { name: 'Secure Coding', category: SkillCategory.SECURITY, description: 'Write software resistant to attacks.', iconUrl: null },
  { name: 'Identity & Access', category: SkillCategory.SECURITY, description: 'Manage authentication and authorization.', iconUrl: null },
  { name: 'Threat Modeling', category: SkillCategory.SECURITY, description: 'Identify and reduce security risks.', iconUrl: null },
  { name: 'Machine Learning', category: SkillCategory.AI_ML, description: 'Train models to make predictions.', iconUrl: null },
  { name: 'Deep Learning', category: SkillCategory.AI_ML, description: 'Build neural network systems.', iconUrl: null },
  { name: 'Natural Language Processing', category: SkillCategory.AI_ML, description: 'Work with language data and models.', iconUrl: null },
  { name: 'Computer Vision', category: SkillCategory.AI_ML, description: 'Analyze and understand images.', iconUrl: null },
  { name: 'Prompt Engineering', category: SkillCategory.AI_ML, description: 'Guide generative AI systems effectively.', iconUrl: null },
];

export async function seedSkills(dataSource: DataSource) {
  const repository = dataSource.getRepository(Skill);
  const existingCount = await repository.count();

  if (existingCount > 0) {
    return;
  }

  await repository.insert(skills);
}
