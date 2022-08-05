#extension GL_OES_standard_derivatives : enable
precision highp float;

uniform sampler2D u_Sampler;
varying vec2 v_TexCoord;


void main () {
  // Get samples for -2/3
	float valueL = texture2D(u_Sampler, vec2(v_TexCoord.x + dFdx(v_TexCoord.x), v_TexCoord.y)).z * 255.0;
	float lowerL = mod(valueL, 16.0);
	float upperL = (valueL - lowerL) / 16.0;
	float alphaL = min(abs(upperL - lowerL), 2.0);

  // Get samples for +2/3
	float valueR = texture2D(u_Sampler, vec2(v_TexCoord.x - dFdx(v_TexCoord.x), v_TexCoord.y)).x * 255.0;
	float lowerR = mod(valueR, 16.0);
	float upperR = (valueR - lowerR) / 16.0;
	float alphaR = min(abs(upperR - lowerR), 2.0);

	// Get samples for 0, +1/3, and -1/3
	vec3 valueM = texture2D(u_Sampler, v_TexCoord).xyz * 255.0;
	vec3 lowerM = mod(valueM, 16.0);
	vec3 upperM = (valueM - lowerM) / 16.0;
	vec3 alphaM = min(abs(upperM - lowerM), 2.0);

	// Average the energy over the pixels on either side
	vec4 rgba = vec4(
		(alphaL + alphaM.x + alphaM.y) / 6.0,
		(alphaM.x + alphaM.y + alphaM.z) / 6.0,
		(alphaM.y + alphaM.z + alphaR) / 6.0,
		0.0);

	gl_FragColor = 1.0 - rgba;
}