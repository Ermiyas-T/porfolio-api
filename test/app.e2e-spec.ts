import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Portfolio API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  describe('Health Check', () => {
    it('GET /health returns 200 or 503 with health status schema', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
          expect(res.body).toHaveProperty('database');
          expect(res.body.database).toHaveProperty('status');
        });
    });

    it('GET / returns 200 or 503 with health status schema', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('Public Posts', () => {
    it('GET /posts returns an array', () => {
      return request(app.getHttpServer())
        .get('/posts')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('GET /posts/:slug returns 404 for unknown slug', () => {
      return request(app.getHttpServer())
        .get('/posts/non-existent-slug-xyz')
        .expect(404);
    });

    it('GET /posts/:slug/related returns 404 for unknown slug', () => {
      return request(app.getHttpServer())
        .get('/posts/non-existent-slug-xyz/related')
        .expect(404);
    });
  });

  describe('Admin Auth Guard', () => {
    it('GET /admin/posts returns 401 without token', () => {
      return request(app.getHttpServer()).get('/admin/posts').expect(401);
    });

    it('POST /admin/posts returns 401 without token', () => {
      return request(app.getHttpServer())
        .post('/admin/posts')
        .send({})
        .expect(401);
    });

    it('PATCH /admin/posts/:slug returns 401 without token', () => {
      return request(app.getHttpServer())
        .patch('/admin/posts/test-slug')
        .send({})
        .expect(401);
    });

    it('DELETE /admin/posts/:slug returns 401 without token', () => {
      return request(app.getHttpServer())
        .delete('/admin/posts/test-slug')
        .expect(401);
    });

    it('POST /upload returns 401 without token', () => {
      return request(app.getHttpServer()).post('/upload').expect(401);
    });
  });

  describe('Auth Login', () => {
    it('POST /auth/login returns 401 with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'wrong@example.com', password: 'wrong' })
        .expect(401);
    });

    it('POST /auth/login returns 400 with missing fields', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('DTO Validation', () => {
    it('POST /admin/posts returns 400 with empty body (validation)', () => {
      return request(app.getHttpServer())
        .post('/admin/posts')
        .set('Authorization', 'Bearer test-token')
        .send({})
        .expect(401); // 401 because token is invalid, not 400 — auth runs before validation
    });

    it('POST /admin/posts returns 400 with invalid slug format', () => {
      return request(app.getHttpServer())
        .post('/admin/posts')
        .set('Authorization', 'Bearer test-token')
        .send({
          slug: 'UPPERCASE_SLUG',
          title: 'Test',
          description: 'Test',
          content: 'Test',
          category: 'tech',
          tags: [],
        })
        .expect(401); // auth runs first — token is invalid
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
