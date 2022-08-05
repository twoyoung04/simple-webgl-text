precision highp float;

attribute vec2 a_Position2;
attribute vec2 a_TexCoord;

varying vec2 v_TexCoord;

void main () {
  v_TexCoord = a_TexCoord;
  gl_Position = vec4(a_Position2, 0.0, 1.0);
}