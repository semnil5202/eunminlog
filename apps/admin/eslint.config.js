import baseConfig from '@eunminlog/eslint-config/base';
import reactConfig from '@eunminlog/eslint-config/react';
import nextjsConfig from '@eunminlog/eslint-config/nextjs';

export default [
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  { ignores: ['next-env.d.ts', 'src/components/ui/**', 'src/hooks/**', 'src/lib/utils.ts'] },
];
