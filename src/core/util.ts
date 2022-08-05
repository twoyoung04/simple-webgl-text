export const fetchResource = function(name, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 1 ? '/' + name : name);
  xhr.onload = function() {
    callback(new Uint8Array(xhr.response));
  };
  xhr.responseType = 'arraybuffer';
  xhr.send();
};

export class Vector {
  x: number
  y: number

  constructor(x, y) {
    this.x = x;
    this.y = y
  }
  multiply (d: number) {
    return new Vector(this.x * d, this.y * d);
  };
  addUpdate(v: Vector) {
    this.x += v.x;
    this.y += v.y;
  };
  divideUpdate(d: number) {
    this.x /= d;
    this.y /= d;
  };
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  };
  set1(x: number, y: number) {
    this.x = x
    this.y = y
  }
  set2(v: Vector) {
    this.x = v.x
    this.y = v.y
  }
}

export class Transform {
  m00 = 1;
  m01 = 0;
  m02 = 0;
  m10 = 0;
  m11 = 1;
  m12 = 0;

  reset() {
    this.m00 = this.m11 = 1;
    this.m01 = this.m02 = this.m10 = this.m12 = 0;
  };

  translate (x: number, y: number) {
    this.m02 += x * this.m00 + y * this.m01;
    this.m12 += x * this.m10 + y * this.m11;
  };
  translate2 (x: number, y: number) {
    this.m02 += x * this.m00 ;
    this.m12 += y * this.m11;
  };

  scale (d: number) {
    this.scaleXY(d, d);
  };
  scaleXY (x: number, y: number) {
    this.m00 *= x;
    this.m01 *= y;
    this.m10 *= x;
    this.m11 *= y;
  };

  set (t: Transform) {
    this.m00 = t.m00;
    this.m01 = t.m01;
    this.m02 = t.m02;
    this.m10 = t.m10;
    this.m11 = t.m11;
    this.m12 = t.m12;
    return this;
  };
}