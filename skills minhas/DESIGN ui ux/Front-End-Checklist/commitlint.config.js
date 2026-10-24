module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allow longer subject lines for detailed commit messages
    'subject-max-length': [2, 'always', 100],
    // Allow longer body lines for detailed descriptions
    'body-max-line-length': [2, 'always', 200],
    // Allow empty body for simple commits
    'body-empty': [0],
    // Allow footer with bot signature
    'footer-max-line-length': [0]
  }
}
