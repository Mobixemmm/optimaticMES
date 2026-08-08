import { NestFactory } from '@nestjs/core';
import { Repository } from 'typeorm';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';

const SALT_ROUNDS = 10;

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

  const users: { name: string; email: string; password: string; role: UserRole }[] = [
    {
      name: 'Administrator MES',
      email: 'admin@optimatic.com',
      password: 'adminadmin',
      role: 'admin',
    },
    {
      name: 'Jan Kowalski',
      email: 'contributor@optimatic.com',
      password: 'contrib123',
      role: 'contributor',
    },
    {
      name: 'Anna Nowak',
      email: 'viewer@optimatic.com',
      password: 'viewer123',
      role: 'viewer',
    },
    {
      name: 'Konto Gościa',
      email: 'guest@optimatic.com',
      password: 'guest123',
      role: 'guest',
    },
  ];

  for (const u of users) {
    const exists = await userRepo.findOne({ where: { email: u.email } });
    if (!exists) {
      const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
      await userRepo.save({
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
      });
      console.log(`✅ Dodano użytkownika: ${u.name} (${u.email})`);
    } else {
      console.log(`ℹ️ Użytkownik ${u.email} już istnieje`);
    }
  }

  console.log('🎉 Seedowanie użytkowników zakończone!');
  await app.close();
}

void bootstrap();
