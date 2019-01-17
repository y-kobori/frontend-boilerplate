class Sample {
  constructor(opts = {}) {
    this.name = opts.name || 'noname';
  }

  greet() {
    console.log(`Hello, ${this.name}!`);
  }
}

export default Sample;
