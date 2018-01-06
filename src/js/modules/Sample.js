class Sample {
  constructor(opts = {}) {
    this.name = opts.name || 'noname';
  }

  greet() {
    console.log(`Hello, I'm ${this.name}`);
  }
}

export default Sample;