# Swagger / OpenAPI Setup Guide — NestJS

A step-by-step guide to adding interactive API documentation to a NestJS application using `@nestjs/swagger`.

---

## What is Swagger / OpenAPI?

- **OpenAPI** is a specification for describing REST APIs (endpoints, request schemas, response codes, auth).
- **Swagger UI** renders that spec as an interactive web page where you can read docs and send live requests.
- `@nestjs/swagger` auto-generates the OpenAPI spec from **decorators** you add to your DTOs and controllers.

---

## Step 1 — Install Dependencies

```bash
pnpm add @nestjs/swagger swagger-ui-express
```

| Package | What it does |
|---|---|
| `@nestjs/swagger` | NestJS integration — generates OpenAPI spec, provides decorators |
| `swagger-ui-express` | Serves the Swagger UI HTML page at a URL of your choice |

---

## Step 2 — Configure in `main.ts`

Open `src/main.ts` and add the Swagger setup **before** all other middleware.

### Code

```typescript
// 1. Import the Swagger classes
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

// Inside bootstrap(), before the app starts listening:
const swaggerConfig = new DocumentBuilder()
  .setTitle('Portfolio API')                                // Title shown in Swagger UI header
  .setDescription('Blog content and admin management API')  // Description shown below title
  .setVersion('1.0')                                        // API version
  .addBearerAuth()                                          // Adds "Authorize" button for JWT tokens
  .addCookieAuth('portfolio_admin_token')                   // Adds cookie-based auth option
  .build();

const document = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup('api/docs', app, document);  // ← Swagger UI will be at http://localhost:3001/api/docs
```

### Syntax Explained

| Method | Purpose |
|---|---|
| `new DocumentBuilder()` | Factory that builds the OpenAPI config object |
| `.setTitle('...')` | Sets the API title in the Swagger header |
| `.setDescription('...')` | Sets the description text |
| `.setVersion('...')` | API version string |
| `.addBearerAuth()` | Tells Swagger that some endpoints require an `Authorization: Bearer <token>` header. Adds an "Authorize" button where users paste their JWT |
| `.addCookieAuth('name')` | Same but for cookie-based auth (the cookie name must match what your app uses) |
| `.build()` | Finalises the config object |
| `SwaggerModule.createDocument(app, config)` | Reads all your decorators and generates the full OpenAPI JSON spec |
| `SwaggerModule.setup(path, app, doc)` | Mounts the Swagger UI at the given path — visit `http://localhost:3001/api/docs` |

### Where to place it

Put this **after** `NestFactory.create()` and **before** `app.listen()`:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── SWAGGER ──────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Portfolio API')
    .setDescription('...')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // ── Other middleware ─────────────────────────────────────
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({ ... });

  await app.listen(3001);
}
```

---

## Step 3 — Decorate DTOs (Data Transfer Objects)

DTOs define the shape of request bodies. `@nestjs/swagger` reads their decorators to build the request/response schemas in OpenAPI.

### Basic Property Decorator — `@ApiProperty()`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ description: 'URL-safe slug (lowercase, hyphens only)' })
  slug: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ default: false })
  featured?: boolean;
}
```

### Syntax Explained

| Decorator | When to use |
|---|---|
| `@ApiProperty()` | Required field — appears in Swagger with a red asterisk |
| `@ApiPropertyOptional()` | Optional field — appears without the asterisk |

### `@ApiProperty()` Options

| Option | Example | What it does |
|---|---|---|
| `description` | `'Markdown content'` | Explanation text shown in Swagger |
| `example` | `'admin@example.com'` | Sample value pre-filled in Swagger UI |
| `default` | `false` | Default value shown in schema |
| `enum` | `PostStatus` | Makes Swagger render a dropdown of enum values |
| `type` | `[String]` | For arrays — tells Swagger this is `string[]` |

### Full Example — `create-post.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ description: 'URL-safe slug (lowercase, hyphens only)' })
  slug: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ description: 'Markdown content (serialized from TipTap)' })
  content: string;

  @ApiProperty({ type: [String] })       // ← array of strings
  tags: string[];

  @ApiPropertyOptional({ default: false })
  featured?: boolean;

  @ApiPropertyOptional({ enum: PostStatus, default: PostStatus.DRAFT })
  status?: PostStatus;
}
```

### Examples DTO — `login.dto.ts`

Use `example` to show realistic sample values:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiProperty({ example: 'your_password' })
  password: string;
}
```

### Update DTO with `PartialType`

When your update DTO uses `PartialType`, Swagger automatically treats every field as optional:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';

export class UpdatePostDto extends PartialType(CreatePostDto) {}
// Swagger will show all CreatePostDto fields but without required markers
```

---

## Step 4 — Decorate Controllers

Controller decorators group endpoints, describe each route, document response codes, and mark auth requirements.

### `@ApiTags()` — Group routes

Put on the controller class. All routes in that controller appear under a heading in Swagger:

```typescript
@ApiTags('Posts')    // ← groups all routes below under "Posts" heading
@Controller()
export class PostsController {}
```

### `@ApiOperation()` — Describe a single endpoint

Put on each route handler method:

```typescript
@ApiOperation({ summary: 'List all published posts (public)' })
@Get('posts')
findAllPublished() { ... }
```

| Option | Purpose |
|---|---|
| `summary` | Short title shown next to the route |
| `description` | (optional) Longer explanation |

### `@ApiResponse()` — Document possible responses

| Option | Purpose |
|---|---|
| `status` | HTTP status code |
| `description` | What that response means |

```typescript
@ApiOperation({ summary: 'Get a published post by slug' })
@ApiResponse({ status: 200, description: 'Post found' })
@ApiResponse({ status: 404, description: 'Post not found or not published' })
@Get('posts/:slug')
findBySlug(@Param('slug') slug: string) { ... }
```

You can stack multiple `@ApiResponse()` decorators.

### `@ApiBearerAuth()` — Mark JWT-protected routes

Put this on admin-only routes. It adds a lock icon in Swagger UI. Users click "Authorize" at the top, paste their JWT, and the lock unlocks:

```typescript
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Post('admin/posts')
create(@Body() dto: CreatePostDto) { ... }
```

> Requires `.addBearerAuth()` in `main.ts` — otherwise the lock icon won't appear.

### Full Controller Example — `posts.controller.ts`

```typescript
@ApiTags('Posts')
@Controller()
export class PostsController {
  // ── Public routes ────────────────────────────

  @ApiOperation({ summary: 'List all published posts (public)' })
  @ApiResponse({ status: 200, description: 'Array of published posts' })
  @Get('posts')
  findAllPublished() { ... }

  @ApiOperation({ summary: 'Get a published post by slug (public)' })
  @ApiResponse({ status: 200, description: 'Post found' })
  @ApiResponse({ status: 404, description: 'Post not found or not published' })
  @Get('posts/:slug')
  findBySlug(@Param('slug') slug: string) { ... }

  // ── Admin routes (require JWT) ──────────────

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all posts including drafts (admin)' })
  @ApiResponse({ status: 200, description: 'Array of all posts' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Get('admin/posts')
  findAll() { ... }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post (admin)' })
  @ApiResponse({ status: 201, description: 'Post created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Slug already in use' })
  @UseGuards(JwtAuthGuard)
  @Post('admin/posts')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePostDto) { ... }
}
```

### Auth Controller

```typescript
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @ApiOperation({ summary: 'Authenticate admin user' })
  @ApiBody({ type: LoginDto })     // ← explicitly tell Swagger the request body type
  @ApiResponse({ status: 200, description: 'Login successful, JWT returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) { ... }
}
```

### Upload Controller (file upload)

File uploads need special Swagger decorators because the body isn't JSON:

```typescript
@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload an image to Cloudinary (admin)' })
  @ApiConsumes('multipart/form-data')        // ← tell Swagger the content type
  @ApiBody({                                  // ← manually describe the form field
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',                  // ← renders a file picker in Swagger UI
          description: 'Image file (jpeg, png, webp, gif) up to 5MB',
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(@UploadedFile() file: Express.Multer.File) { ... }
}
```

### `@ApiConsumes()` Syntax

| Value | Meaning |
|---|---|
| `'multipart/form-data'` | File upload — Swagger shows a "Choose File" button |
| `'application/json'` | Regular JSON body (default, usually not needed) |

---

## Step 5 — View Your Docs

1. Start the server:
   ```bash
   pnpm start:dev
   ```

2. Open your browser:
   ```
   http://localhost:3001/api/docs
   ```

3. You'll see:
   - All routes grouped by `@ApiTags()` (Posts, Auth, Upload)
   - Request schemas from your DTOs
   - Response codes from `@ApiResponse()`
   - An **Authorize** button (top-right) to paste a JWT token
   - File upload fields rendered as file pickers

4. Click "Try it out" on any endpoint to send a real request from the browser.

---

## Complete Checklist

| Step | What to do | Decorators / Code |
|---|---|---|
| 1 | Install packages | `pnpm add @nestjs/swagger swagger-ui-express` |
| 2 | Configure in `main.ts` | `DocumentBuilder` → `createDocument()` → `setup()` |
| 3 | Decorate DTOs | `@ApiProperty()`, `@ApiPropertyOptional()` on each field |
| 4 | Tag controllers | `@ApiTags('Name')` on controller class |
| 5 | Describe each route | `@ApiOperation({ summary })` on each handler |
| 6 | Document responses | `@ApiResponse({ status, description })` |
| 7 | Mark auth routes | `@ApiBearerAuth()` on admin handlers |
| 8 | Handle file uploads | `@ApiConsumes('multipart/form-data')` + `@ApiBody({ schema })` |
| 9 | Start & visit | `pnpm start:dev` → `http://localhost:3001/api/docs` |

---

## Common Questions

**Q: Swagger UI shows no routes?**  
A: You probably forgot `SwaggerModule.createDocument()` or imported decorators from the wrong path. Make sure `@nestjs/swagger` is imported.

**Q: The "Authorize" button doesn't work with my routes?**  
A: Every guarded route needs both `@UseGuards(JwtAuthGuard)` and `@ApiBearerAuth()`. One without the other means either auth works but Swagger doesn't show the lock, or the lock shows but auth isn't enforced.

**Q: My DTO shows no fields in Swagger?**  
A: Every field needs `@ApiProperty()` or `@ApiPropertyOptional()`. Fields without these decorators are invisible to Swagger.

**Q: File upload shows a text field instead of a file picker?**  
A: You need `format: 'binary'` in the `@ApiBody()` schema. Without it, Swagger renders a regular text input.
