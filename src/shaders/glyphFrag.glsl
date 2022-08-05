precision highp float;

uniform vec4 u_channel;

varying vec2 v_coord;

void main () {
  if (v_coord.x * v_coord.x - v_coord.y > 0.0) {
		discard;
	}
  gl_FragColor = u_channel * (gl_FrontFacing ? 16.0 / 255.0 : 1.0 / 255.0);

}