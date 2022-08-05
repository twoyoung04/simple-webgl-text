precision highp float;

attribute vec4 a_Position;
uniform mat3 u_matrix3;
varying vec2 v_coord;

void main () {
  v_coord = a_Position.zw;
	gl_Position = vec4(u_matrix3 * vec3(a_Position.xy, 1.0), 0.0).xywz;
}