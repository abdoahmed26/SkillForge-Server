import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DataSource } from 'typeorm';
import { seedSkills } from './skills/skills.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{
    logger: ['error', 'warn'],
  });
  app.use(cookieParser())

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix(process.env.API_VERSION || 'api/v1');
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('SkillForge API')
    .setDescription('SkillForge REST API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  try {
    const dataSource = app.get(DataSource);
    await seedSkills(dataSource);
    console.log('Skill catalog seed complete');
  } catch (error) {
    console.error('Skill catalog seed failed:', error);
  }
  await app.listen(process.env.PORT ?? 3000, () => {
    console.log(`Application is running on: http://localhost:${process.env.PORT}`);
  });
}

void bootstrap();
