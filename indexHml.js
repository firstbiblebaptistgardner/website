const fs = require('fs');
const bible = require('./bible.js');
const hml = require('./hml.js');
const modOps = require('./modOps.js');

const navItems = {
  'Home': '/',
  'Calendar': '/calendar',
  'Prayer Request': '/prayerRequest',
  //'Missions': '/missions',
};

const navBar = hml.ul({class: 'navBar'},
  Object.entries(navItems).map(([name,href])=>hml.li([hml.a({href},[name])]))
);

const headTag = hml.head([
  hml.title([
    'First Bible Baptist Gardner'
  ]),
  hml.link({rel: 'stylesheet', href: '/style.css'})
]);

const banners = () => JSON.parse(fs.readFileSync('bannerData.json'))
  .filter(
    bd => new Date(bd.showTo) > new Date()
  ).filter(
    bd => !bd.showFrom || new Date(bd.showFrom) < new Date()
  ).map(bd=>hml.div(
    {class: 'banner', style:`background-color:${bd.backgroundColor};padding:2em`},
    [bd.text]
  ));

const index = hml.html([
  headTag,
  hml.body([
    ...banners(),
    hml.img({class: 'church', src: '/church.jpg'}),
    hml.h1(["First Bible Baptist Church Gardner"]),
    hml.h2(["7 Church St, Gardner, MA 01440 * Sun 10:45"]),
    hml.h3(["Bible study Sun 9:45 & Wed 6:30"]),
    hml.div({class: 'verse'}, [bible.randomVerse]),
    navBar,
    hml.div([
      hml.h2(["God's plan of salvation"]),
      hml.ol(
        [
          'No one is righteous [Rom 3:10]',
          'For all have sinned and come short of God\'s glory [Rom 3:23]',
          'Because of Adam, no one can stop sinning for all are natural born sinners [Rom 5:23]',
          'God must punish sinners.  Since they cannot enter into heaven they will be cast into Hell [Rom 6:23][Rev 20:11-15]',
          'But though you are a sinner God still loves you and wants you in heaven [Rom 6:23][Rom 5:8][2Pe 3:9]',
          'So God sent Jeuss to pay the penalty for your sins.  On the cross He took your sins upon Himself, died for them, was buried, and rose again from the dead [1Cor 15:3-4][1Pe 2:24]',
          'How can you be saved from hell and go to heaven?  Change your mind, believe these points, ask Christ to save you, and "thou shalt be saved"[Rom 10:9-10][Jn 3:16]'
        ].map(x=>hml.li(hml.tooltipsOnVerseRefsArray(x)))
      ),
      hml.p(hml.tooltipsOnVerseRefsArray('Why not trust Christ as your Savior right now by praying "Lord Jesus, I believe and confess that I am a sinner and need to be saved from hell.  I also believe that Jesus died on the cross to pay for my sins, that He was buried, and rose again from the dead.  Forgive my sins, come into my heart and save my soul.  In Jesus\' Name, amen."[Lk 18:10-14][Lk 23:39-43]'))
    ])
  ])
]);

const calendar = hml.html([
  headTag,
  hml.body([
    ...banners(),
    hml.iframe({
      src: "https://calendar.google.com/calendar/embed?src=firstbiblebaptistgardner%40gmail.com&ctz=America%2FNew_York",
      style: "border: 0",
      width: "800",
      height: "600",
      frameborder: "0",
      scrolling: "no"
    }),
    hml.div({class: 'verse'}, [bible.randomVerse])
  ])
]);

const prayerRequest = hml.html([
  ...banners(),
  headTag,
  hml.body([
    hml.form({
      action: '/api/prayerRequest',
      method: 'post',
      encType: 'multipart/form-data'
    }, [
      hml.textarea({
        rows: 20,
        cols: 80,
        maxlength: '10000',
        name: 'prayerRequest'
      }),
      hml.p([
        'name (not required)',
        hml.input({
          type: 'text',
          name: 'name'
        })
      ]),
      hml.p([
        'email (not required)',
        hml.input({
          type: 'text',
          name: 'email'
        })
      ]),
      hml.input({type: 'submit', value: 'send'})
    ]),
    hml.div({class: 'verse'}, [bible.randomVerse])
  ])
]);

const prayerRequestComplete = hml.html([
  ...banners(),
  headTag,
  hml.body([
    hml.p(['prayer request added']),
    hml.p([bible.randomVerse]),
    hml.p([bible.randomVerse]),
    hml.p([bible.randomVerse]),
    navBar
  ])
]);

const modLogin = hml.html([
  headTag,
  bible.randomVerse,
  hml.form({
    action: '/api/modLogin',
    method: 'post',
    enctype: 'multipart/form-data'
  },[
    hml.input({type: 'text', value: 'mod key here', name: 'modKey'}),
    hml.input({type: 'text', value: 'mod name', name: 'modName'}),
    hml.input({type: 'submit', value: 'submit'})
  ])
]);

const modPrayerRequests = hml.html([
  headTag,
  bible.randomVerse,
  modOps.prayerRequests
]);

module.exports = {
  index,
  calendar,
  prayerRequest,
  prayerRequestComplete,
  modLogin,
  modPrayerRequests,
}
