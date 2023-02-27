hml = require('./hml');
const tags = hml.html([
  hml.head([
    hml.title(['hi'])
  ]),
  hml.body([
    hml.p(['hi'])
  ])
]);
console.log(tags);
const x = tags.render();
console.log(x);