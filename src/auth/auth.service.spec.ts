import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrisma = {
    adminUser: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = {
      email: 'admin@example.com',
      password: 'correct-password',
    };
    const hashedPassword = '$2b$12$hashedpasswordstring';
    const adminUser = {
      id: '1',
      email: 'admin@example.com',
      password: hashedPassword,
    };

    it('returns an accessToken on valid credentials', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue(adminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token-123');

      const result = await service.login(loginDto);

      expect(mockPrisma.adminUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'correct-password',
        hashedPassword,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'admin@example.com',
      });
      expect(result).toEqual({ accessToken: 'jwt-token-123' });
    });

    it('throws UnauthorizedException when email does not exist', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue(adminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('uses a generic error message to avoid leaking whether the email exists', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('uses the same error message for wrong password', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue(adminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@example.com', password: 'wrong' }),
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
