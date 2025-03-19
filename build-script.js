// Simple build script to run TypeScript compiler
import { execSync } from 'child_process';

try {
  console.log('Running TypeScript compiler...');
  execSync('tsc', { stdio: 'inherit' });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
