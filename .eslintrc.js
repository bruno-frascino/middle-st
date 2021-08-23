module.exports = {
  env: {
    node: true,
  },
  root: true,
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  // parserOptions: {
  //   ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
  //   sourceType: "module" // Allows for the use of imports
  // },
  extends: [
    'airbnb-base',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    'plugin:jest/recommended',
    // "prettier/@typescript-eslint", // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
    'plugin:prettier/recommended', // should be the last one
  ],
  plugins: ['@typescript-eslint', 'jest', '@getify/proper-arrows'],
  // Additional config for eslint-plugin-import
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts'],
    },
    'import/resolver': {
      alias: {
        map: [['@src', './src']],
        extensions: ['.ts', '.js'],
      },
    },
  },
  rules: {
    'prefer-const': 'error',
    'no-var': 'error',
    'import/extensions': [
      'warn',
      'ignorePackages',
      {
        js: 'never',
        ts: 'never',
      },
    ],
    'no-param-reassign': 'warn',
    /** @see https://github.com/benmosher/eslint-plugin-import/issues/1453 */
    'import/no-cycle': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/prefer-default-export': 'off',
    'no-console': 'off', // TODO logging and remove this eslint exception
    'no-unused-expressions': 'off',
    'no-nested-ternary': 'off',
    'spaced-comment': ['error', 'always', { markers: ['/'] }],
    curly: 'error',
    'sort-imports': [
      'error',
      {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
      },
    ],
    // '@typescript-eslint/no-empty-function': 'off',
    // '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    // '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-types': 'off',
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    camelcase: 'off',
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',

    // Use function declarations instead of function expressions. See https://www.freecodecamp.org/news/constant-confusion-why-i-still-use-javascript-function-statements-984ece0b72fd/
    // Don't use arrow functions for top-level functions or as exports, as it makes the code harder to read.
    '@getify/proper-arrows/where': ['error', { global: true, export: true, property: false }],

    // Setup zones so that we don't have dependencies between modules that should not be dependent on each other.
    // 'import/no-restricted-paths': [
    //   'error',
    //   {
    //     zones: [],
    //   },
    // ],
  },
};
