// thin wrapper: the rig lives in js/heroart.js so the game can re-render customised looks
const A = require('../../js/heroart.js');
A.setLook(A.DEFAULT_LOOK);
module.exports = { defs: A.heroDefs(), hero: A.hero, anims: A.anims, frame: A.frame, weaponXform: A.weaponXform, WS: A.WS };
