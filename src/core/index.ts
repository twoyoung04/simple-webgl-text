import * as glyphVertexSource from '../shaders/glyphVertex.glsl';
import * as glyphFragSource from '../shaders/glyphFrag.glsl';
import * as textVertexSource from '../shaders/textVertex.glsl';
import * as textFragSource from '../shaders/textFrag.glsl';
import { fetchResource, Transform, Vector } from './util';

import * as opentype from 'opentype.js';

function getContext() {
  let canvas = document.getElementById('canvas') as HTMLCanvasElement;
  let gl = canvas.getContext('webgl');

  gl.getExtension('OES_standard_derivatives');
  return gl;
}

function compileProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  FragSource: string
) {
  let vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
  }
  let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, FragSource);
  gl.compileShader(fragShader);
  if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(fragShader));
  }

  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);
  return program;
}

function bindNewFrameBuffer(gl: WebGLRenderingContext) {
  const frameBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

  let texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  // define size and format of level 0
  let canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const level = 0;
  const internalFormat = gl.RGBA;
  const border = 0;
  const format = gl.RGBA;
  const type = gl.UNSIGNED_BYTE;
  const data = null;
  const targetTextureWidth = canvas.width;
  const targetTextureHeight = canvas.height;
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    targetTextureWidth,
    targetTextureHeight,
    border,
    format,
    type,
    data
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0
  );
  console.log(
    gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE
  );

  return texture;
}

function handleFont(font: opentype.Font, text: string) {
  let vertices = [];
  let currentWidth = 0;
  for (let i = 0; i < text.length; i++) {
    let glyph = font.charToGlyph(text[i]);
    let path = glyph.getPath(0, 0, 1);

    let bytes = compilePathCommands(path.commands, currentWidth, 1000);
    vertices.push(...getTriangles(bytes));
    currentWidth += glyph.advanceWidth;
  }
  return vertices;
}

function getTriangles(bytes: number[]) {
  let vertices = [];
  let firstX,
    firstY,
    currentX,
    currentY,
    contourCount = 0;

  const moveTo = function (x, y) {
    firstX = currentX = x;
    firstY = currentY = y;
    contourCount = 0;
  };

  const lineTo = function (x, y) {
    if ((contourCount = (contourCount + 1) | 0) >= 2) {
      appendTriangle(
        vertices,
        firstX,
        firstY,
        currentX,
        currentY,
        x,
        y,
        TriangleKind.SOLID
      );
    }

    currentX = x;
    currentY = y;
  };

  const curveTo = function (cx, cy, x, y) {
    if ((contourCount = (contourCount + 1) | 0) >= 2) {
      appendTriangle(
        vertices,
        firstX,
        firstY,
        currentX,
        currentY,
        x,
        y,
        TriangleKind.SOLID
      );
    }

    appendTriangle(
      vertices,
      currentX,
      currentY,
      cx,
      cy,
      x,
      y,
      TriangleKind.QUADRATIC_CURVE
    );
    currentX = x;
    currentY = y;
  };

  const close = function () {
    currentX = firstX;
    currentY = firstY;
    contourCount = 0;
  };

  function appendTriangle(vertices, ax, ay, bx, by, cx, cy, kind) {
    switch (kind) {
      case TriangleKind.SOLID: {
        vertices.push(ax, ay, 0, 1);
        vertices.push(bx, by, 0, 1);
        vertices.push(cx, cy, 0, 1);
        break;
      }

      case TriangleKind.QUADRATIC_CURVE: {
        vertices.push(ax, ay, 0, 0);
        vertices.push(bx, by, 0.5, 0);
        vertices.push(cx, cy, 1, 1);
        break;
      }
    }
  }

  let scale = 1;
  for (let i = 0; i < bytes.length; ) {
    switch (bytes[i++]) {
      case Command.MOVE_TO:
        let x = bytes[i++] / scale;
        let y = bytes[i++] / scale;
        // console.log(x, y);
        moveTo(x, y);
        break;
      case Command.LINE_TO:
        let x1 = bytes[i++] / scale;
        let y1 = bytes[i++] / scale;
        // console.log(x1, y1);
        lineTo(x1, y1);
        break;
      case Command.CURVE_TO:
        let cx = bytes[i++] / scale;
        let cy = bytes[i++] / scale;
        let x2 = bytes[i++] / scale;
        let y2 = bytes[i++] / scale;
        // console.log(cx, cy, x2, y2);
        curveTo(cx, cy, x2, y2);
        break;
      case Command.CLOSE:
        close();
        break;
      default:
        throw 'command error';
    }
  }

  return vertices;
}

enum TriangleKind {
  SOLID,
  QUADRATIC_CURVE,
}

enum Command {
  MOVE_TO,
  LINE_TO,
  CURVE_TO,
  CLOSE,
}

function compilePathCommands(
  commands: opentype.PathCommand[],
  currentWidth: number,
  units: number
) {
  let bytes = [];

  for (let i = 0; i < commands.length; i++) {
    let command = commands[i];
    switch (command.type) {
      case 'M': {
        bytes.push(Command.MOVE_TO);
        bytes.push(command.x + currentWidth / units, command.y);
        break;
      }

      case 'L': {
        bytes.push(Command.LINE_TO);
        bytes.push(command.x + currentWidth / units, command.y);
        break;
      }

      case 'Q': {
        bytes.push(Command.CURVE_TO);
        bytes.push(command.x1 + currentWidth / units, command.y1);
        bytes.push(command.x + currentWidth / units, command.y);
        break;
      }

      case 'Z': {
        bytes.push(Command.CLOSE);
        break;
      }

      default: {
        throw new Error('Unsupported command "' + command.type + '"');
      }
    }
  }

  return bytes;
}

function main(data: number[]) {
  let gl = getContext();

  let glyphProgram = compileProgram(gl, glyphVertexSource, glyphFragSource);
  let textProgram = compileProgram(gl, textVertexSource, textFragSource);

  // At first, use glyphProgram to render text to frameBuffer
  gl.useProgram(glyphProgram);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);

  let a_Position = gl.getAttribLocation(glyphProgram, 'a_Position');
  let u_channel_loc = gl.getUniformLocation(glyphProgram, 'u_channel');
  let u_matrix3_loc = gl.getUniformLocation(glyphProgram, 'u_matrix3');

  let buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  let texture = bindNewFrameBuffer(gl);

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // draw several times for msaa
  let JITTER_PATTERN = [
    new Vector(-5 / 12, -5 / 12),
    new Vector(-3 / 12, 1 / 12),
    new Vector(-1 / 12, -1 / 12),
    new Vector(1 / 12, 5 / 12),
    new Vector(3 / 12, -3 / 12),
    new Vector(5 / 12, 3 / 12),
  ];

  let canvas = document.getElementById('canvas');
  let width = canvas.clientWidth;
  let height = canvas.clientHeight;

  let devicePixelRatio = window.devicePixelRatio;

  let _transformB = new Transform();

  for (let i = 0; i < JITTER_PATTERN.length; i++) {
    let offset = JITTER_PATTERN[i];
    _transformB.reset();

    _transformB.translate(
      (offset.x * 2) / width / devicePixelRatio,
      (offset.y * 2) / height / devicePixelRatio
    );
    _transformB.scale(0.4);
    // 不同样本区分颜色通道
    if (i % 2 == 0) {
      gl.uniform4f(
        u_channel_loc,
        i == 0 ? 1 : 0,
        i == 2 ? 1 : 0,
        i == 4 ? 1 : 0,
        0
      );
    }
    // 应用样本的偏移量
    let t = _transformB;
    gl.uniformMatrix3fv(
      u_matrix3_loc,
      false,
      new Float32Array([t.m00, t.m01, t.m02, t.m10, t.m11, t.m12, 0, 0, 1])
    );

    gl.drawArrays(gl.TRIANGLES, 0, data.length / 4);
  }

  console.log('render to frameBuffer ... done');

  gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.useProgram(textProgram);

  let new_data = new Float32Array([-1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0]);
  let textureData = new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]);

  let a_Position2 = gl.getAttribLocation(textProgram, 'a_Position2');
  let a_TexCoord = gl.getAttribLocation(textProgram, 'a_TexCoord');
  let u_Sampler = gl.getUniformLocation(textProgram, 'u_Sampler');

  let buffer1 = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer1);
  gl.bufferData(gl.ARRAY_BUFFER, new_data, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position2, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position2);

  let textureBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, textureData, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_TexCoord);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

opentype.load('static/font/yon3.ttf', (error, font) => {
  let text = '等我';
  let vertices = handleFont(font, text);
  // vertices = vertices.map((v, index) => index % 4 < 2 ? v / 2 : v)
  main(vertices);
});
