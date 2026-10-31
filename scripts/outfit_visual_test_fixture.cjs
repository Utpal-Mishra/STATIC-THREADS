const zlib = require('node:zlib');
function png() {
  const crc = buffer => { let n = 0xffffffff; for (const b of buffer) { n ^= b; for (let i=0;i<8;i++) n=(n>>>1)^((n&1)?0xedb88320:0); } return (n ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const label=Buffer.from(type), output=Buffer.alloc(data.length+12); output.writeUInt32BE(data.length); label.copy(output,4);data.copy(output,8);output.writeUInt32BE(crc(Buffer.concat([label,data])),data.length+8);return output; };
  const header=Buffer.alloc(13);header.writeUInt32BE(1536);header.writeUInt32BE(1024,4);header[8]=8;header[9]=6;
  const pixels=Buffer.alloc((1536*4+1)*1024,225);for(let y=0;y<1024;y++)pixels[y*(1536*4+1)]=0;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
module.exports = { png };
