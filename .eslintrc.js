module.exports = {
  "extends": "airbnb",
  "env": {
    // I write for browser
    "browser": true,
    // in CommonJS
    "node": true,
    "jquery": true
  },
  "rules": {
    "no-bitwise": "off",
    "no-param-reassign": "off",
    "no-undef": "off"
  },
  "plugins": [
      "react",
      "jsx-a11y",
      "import"
  ]
};