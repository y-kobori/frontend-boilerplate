// bootstrap
import 'bootstrap';

import Sample from './modules/Sample';

const frontend = new Sample({
  name: 'frontend world'
});

frontend.greet();
