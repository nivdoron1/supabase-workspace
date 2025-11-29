import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import { execa } from 'execa';
import { DATABASE_SERVICE_TEMPLATE } from './templates/DATABASE_SERVICE_TEMPLATE';
import { DATABASE_TYPES_TEMPLATE } from './templates/DATABASE_TYPES_TEMPLATE';
import { GENERATE_TEMPLATE } from './templates/GENERATE_TEMPLATE';
import { VITE_ENV_TEMPLATE } from './templates/VITE_ENV_TEMPLATE';

async function run() {
    const args = process.argv.slice(2);
    const workspaceName = args[0] || 'supabase-workspace';
    const targetDir = path.resolve(process.cwd(), workspaceName);

    if (await fs.pathExists(targetDir)) {
        console.error(`Directory ${workspaceName} already exists. Choose a different name.`);
        process.exit(1);
    }

    // Prompt for additional info
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'gitUrl',
            message: 'Enter Git repository URL (optional):',
        },
        {
            type: 'confirm',
            name: 'createVite',
            message: 'Do you want to create an example Vite app?',
            default: true,
        },
    ]);

    const { gitUrl, createVite } = answers;

    // Create workspace directory
    await fs.mkdirp(targetDir);
    console.log(`Created workspace directory: ${workspaceName}`);

    // Create empty yarn.lock to isolate workspace
    await fs.writeFile(path.join(targetDir, 'yarn.lock'), '');

    // Initialise Yarn workspace
    await execa('yarn', ['init', '-y'], { cwd: targetDir, stdio: 'inherit' });

    // Configure root package.json
    const pkgPath = path.join(targetDir, 'package.json');
    const pkg = await fs.readJson(pkgPath);

    pkg.private = true;
    pkg.workspaces = ['packages/*', 'apps/*'];
    pkg.packageManager = 'yarn@4.12.0';
    pkg.version = '1.0.0';

    if (gitUrl) {
        pkg.repository = gitUrl;
    }

    pkg.scripts = {
        "build": "yarn workspaces foreach --all run build",
        "dev": createVite ? "yarn workspace example run dev" : "echo 'No app to run'",
        "clean": "yarn workspaces foreach --all run clean || true",
        "new-supabase": "./scripts/generate-supabase-package.sh"
    };

    pkg.devDependencies = {
        "typescript": "^5.3.0",
        "vite": "^5.0.0"
    };

    await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    console.log('Configured Yarn workspaces and package.json');

    // Create README.md
    const readmeContent = `# ${workspaceName}

This is a Supabase monorepo workspace generated with \`supabase-workspace-cli\`.

## Structure

- \`packages/supabase-core\`: Core Supabase client and types.
- \`packages/stripe-core\`: Stripe integration and Edge Function generator.
- \`apps/\`: Application packages (e.g., Vite apps).
- \`scripts/\`: Utility scripts.

## Getting Started

1.  Install dependencies:
    \`\`\`bash
    yarn install
    \`\`\`

2.  Build packages:
    \`\`\`bash
    yarn build
    \`\`\`

3.  ${createVite ? 'Run the example app:\n    ```bash\n    yarn dev\n    ```' : 'Create a new app in `apps/`.'}

## Scripts

- \`yarn build\`: Build all workspaces.
- \`yarn dev\`: Run the development server (defaults to example app if present).
- \`yarn clean\`: Clean all workspaces.
- \`yarn new-supabase\`: Generate a new Supabase instance package.
`;
    await fs.writeFile(path.join(targetDir, 'README.md'), readmeContent);
    console.log('Created README.md');

    // Create supabase-core package
    const coreDir = path.join(targetDir, 'packages', 'supabase-core');
    await fs.mkdirp(coreDir);

    // Create supabase-core package.json
    const corePackageJson = {
        name: `@${workspaceName}/supabase-core`,
        version: '1.0.0',
        description: 'Core Supabase client and types for workspace',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        scripts: {
            build: 'tsc',
            dev: 'tsc --watch'
        },
        keywords: ['supabase', 'client'],
        license: 'MIT',
        dependencies: {
            '@supabase/supabase-js': '^2.84.0'
        },
        devDependencies: {
            typescript: '^5.3.0'
        }
    };
    await fs.writeJson(path.join(coreDir, 'package.json'), corePackageJson, { spaces: 4 });

    // Create supabase-core tsconfig.json
    const coreTsConfig = {
        compilerOptions: {
            target: 'ES2020',
            module: 'ESNext',
            lib: ['ES2020', 'DOM'],
            declaration: true,
            outDir: './dist',
            rootDir: './src',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            moduleResolution: 'bundler',
            resolveJsonModule: true,
            types: ['vite/client']
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist']
    };
    await fs.writeJson(path.join(coreDir, 'tsconfig.json'), coreTsConfig, { spaces: 4 });

    // Create src directory and files
    const srcDir = path.join(coreDir, 'src');
    await fs.mkdirp(srcDir);

    // Write database.types.ts
    await fs.writeFile(path.join(srcDir, 'database.types.ts'), DATABASE_TYPES_TEMPLATE);

    // Write vite-env.d.ts
    await fs.writeFile(path.join(srcDir, 'vite-env.d.ts'), VITE_ENV_TEMPLATE);

    // Write database.service.ts
    await fs.writeFile(path.join(srcDir, 'database.service.ts'), DATABASE_SERVICE_TEMPLATE);

    // Write generate.ts
    await fs.writeFile(path.join(srcDir, 'generate.ts'), GENERATE_TEMPLATE);

    // Write index.ts
    const indexTs = `
// Export types
export * from './database.types';

export * from './database.service';

`;
    await fs.writeFile(path.join(srcDir, 'index.ts'), indexTs);

    // Copy scripts directory if it exists
    const referenceScriptsPath = path.join(__dirname, '../../scripts');
    const targetScriptsPath = path.join(targetDir, 'scripts');

    if (await fs.pathExists(referenceScriptsPath)) {
        await fs.copy(referenceScriptsPath, targetScriptsPath);
        console.log('Copied scripts directory');
    }

    console.log('Created supabase-core package with all files');

    // Create stripe-core package
    const referenceStripeCorePath = path.join(__dirname, '../../packages/stripe-core');
    const targetStripeCorePath = path.join(targetDir, 'packages', 'stripe-core');

    if (await fs.pathExists(referenceStripeCorePath)) {
        await fs.copy(referenceStripeCorePath, targetStripeCorePath, {
            filter: (src) => {
                // Exclude node_modules and dist directories
                const relativePath = path.relative(referenceStripeCorePath, src);
                return !relativePath.startsWith('node_modules') && !relativePath.startsWith('dist');
            }
        });

        // Update package.json workspace reference
        const stripePkgPath = path.join(targetStripeCorePath, 'package.json');
        if (await fs.pathExists(stripePkgPath)) {
            const stripePkg = await fs.readJson(stripePkgPath);
            stripePkg.name = `@${workspaceName}/stripe-core`;
            await fs.writeJson(stripePkgPath, stripePkg, { spaces: 2 });
        }

        console.log('Created stripe-core package');
    }

    if (createVite) {
        const appDir = path.join(targetDir, 'apps', 'example');
        await fs.mkdirp(path.dirname(appDir));
        await execa('yarn', ['create', 'vite', 'example', '--template', 'react-ts'], {
            cwd: path.join(targetDir, 'apps'),
            stdio: 'inherit',
        });
        console.log('Created example Vite app');
    }

    console.log('');
    console.log('📦 Installing dependencies...');
    await execa('yarn', ['install'], { cwd: targetDir, stdio: 'inherit' });

    console.log('');
    console.log('🔨 Building packages...');

    // Build supabase-core
    console.log('Building supabase-core...');
    await execa('yarn', ['build'], { cwd: path.join(targetDir, 'packages', 'supabase-core'), stdio: 'inherit' });

    // Build stripe-core if it exists
    const buildStripeCorePath = path.join(targetDir, 'packages', 'stripe-core');
    if (await fs.pathExists(buildStripeCorePath)) {
        console.log('Building stripe-core...');
        await execa('yarn', ['build'], { cwd: buildStripeCorePath, stdio: 'inherit' });
    }

    console.log('');
    console.log('🎉 Workspace setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log(`  cd ${workspaceName}`);
    if (createVite) {
        console.log('  cd apps/example && yarn dev');
    }
    console.log('  yarn new-supabase <name> ...');
    console.log('');
}

run().catch(err => {
    console.error('Error during workspace creation:', err);
    process.exit(1);
});
