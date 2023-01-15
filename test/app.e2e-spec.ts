import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as pactum from 'pactum';
import { AuthDto } from 'src/auth/dto';
import { EditUserDto } from 'src/user/dto';
import { CreateBookmarkDto, EditBookmarkDto } from 'src/bookmark/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    await app.listen(3000);

    prisma = app.get(PrismaService);
    await prisma.cleanDb();
    pactum.request.setBaseUrl('http://localhost:3000/');
  });

  afterAll(() => {
    app.close();
  });

  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'test@gmail.com',
      password: 'test123',
    };
    describe('Signup', () => {
      it('should throw error if email is empty', () => {
        return pactum
          .spec()
          .post('auth/signup')
          .withBody({ password: dto.password })
          .expectStatus(400);
      });

      it('should throw error if password is empty', () => {
        return pactum
          .spec()
          .post('auth/signup')
          .withBody({ email: dto.email })
          .expectStatus(400);
      });

      it('should throw error if no body is provided', () => {
        return pactum.spec().post('auth/signup').expectStatus(400);
      });

      it('should signup', () => {
        return pactum
          .spec()
          .post('auth/signup')
          .withBody(dto)
          .expectStatus(201);
      });
    });
    describe('Signin', () => {
      it('should throw error if email is empty', () => {
        return pactum
          .spec()
          .post('auth/signin')
          .withBody({ password: dto.password })
          .expectStatus(400);
      });

      it('should throw error if password is empty', () => {
        return pactum
          .spec()
          .post('auth/signin')
          .withBody({ email: dto.email })
          .expectStatus(400);
      });

      it('should throw error if no body is provided', () => {
        return pactum.spec().post('auth/signin').expectStatus(400);
      });

      it('should signin', () => {
        return pactum
          .spec()
          .post('auth/signin')
          .withBody(dto)
          .expectStatus(200)
          .stores('bearer_token', 'access_token');
      });
    });
  });
  describe('User', () => {
    describe('Get auth', () => {
      it('should get authenticated user', () => {
        return pactum
          .spec()
          .get('users/auth')
          .withHeaders({ Authorization: 'Bearer $S{bearer_token}' })
          .expectStatus(200);
      });
    });
    describe('Edit user', () => {
      it('should edit authenticated user', () => {
        const dto: EditUserDto = {
          firstName: 'updatedFirstName',
          email: 'updatedEmail@test.com',
        };
        return pactum
          .spec()
          .patch('users/auth')
          .withHeaders({ Authorization: 'Bearer $S{bearer_token}' })
          .withBody(dto)
          .expectStatus(200);
        // .expectBodyContains(dto.firstname)
        // .expectBodyContains(dto.email)
      });
    });
  });
  describe('Bookmarks', () => {
    describe('Get empty bookmarks', () => {
      it('should get bookmarks', () => {
        return pactum
          .spec()
          .get('bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{bearer_token}' })
          .expectStatus(200)
          .expectBody([]);
      });
    });
    describe('Create bookmark', () => {
      const dto: CreateBookmarkDto = {
        title: 'Test Bookmark',
        link: 'https://google.com',
      };
      it('should create bookmark', () => {
        return pactum
          .spec()
          .post('bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{bearer_token}' })
          .withBody(dto)
          .expectStatus(201)
          .stores('bookmarkId', 'id');
      });
    });
    describe('Get bookmarks', () => {
      it('should get bookmarks', () => {
        return pactum
          .spec()
          .get('bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{bearer_token}' })
          .expectStatus(200)
          .expectJsonLength(1);
      });
    });
    describe('Get bookmark by id', () => {
      it('should get bookmark by id', () => {
        return pactum
          .spec()
          .get('bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{bearer_token}' })
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}');
      });
    });
    describe('Edit bookmark', () => {
      const dto: EditBookmarkDto = {
        description: 'Updated description',
        title: 'Updated title',
      };
      it('should edit bookmark by id', () => {
        return pactum
          .spec()
          .patch('bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{bearer_token}' })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.title)
          .expectBodyContains(dto.description);
      });
    });
    describe('Delete bookmark', () => {
      it('should should bookmark by id', () => {
        return pactum
          .spec()
          .delete('bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{bearer_token}' })
          .expectStatus(204)

      });

      it('should get empty bookmarks', () => {
        return pactum
          .spec()
          .get('bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{bearer_token}' })
          .expectStatus(200)
          .expectJsonLength(0);
      });
    });
  });
});
