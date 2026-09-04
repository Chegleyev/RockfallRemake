/**
 * WebGL 2.0 Shaders for Rockfall
 * Features dynamic quad batching, sub-pixel precision, and CRT post-processing
 */

export const VS_SOURCE = `#version 300 es
precision highp float;
in vec2 a_position;
in vec2 a_texcoord;
in float a_rotation;
in vec4 a_color;

uniform vec2 u_resolution;
uniform vec2 u_camera;
uniform float u_zoom;

out vec2 v_texcoord;
out vec4 v_color;

void main() {
  // Center of quad for rotation
  vec2 pos = a_position;
  
  // Apply camera offset and zoom
  vec2 worldPos = (pos - u_camera) * u_zoom;
  
  // Convert from screen space (pixels) to clip space [-1, 1]
  vec2 zeroToOne = worldPos / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
  v_texcoord = a_texcoord;
  v_color = a_color;
}
`;

export const FS_SOURCE = `#version 300 es
precision highp float;

in vec2 v_texcoord;
in vec4 v_color;

uniform sampler2D u_texture;
uniform bool u_crt_enabled;
uniform vec2 u_canvas_size;
uniform float u_time;
uniform float u_death_progress;
uniform float u_level_start_progress;

out vec4 fragColor;

void main() {
  vec4 texColor = texture(u_texture, v_texcoord);
  vec4 finalColor = texColor * v_color;

  if (u_crt_enabled) {
    // Scanlines
    float scanline = sin(gl_FragCoord.y * 1.5) * 0.12;
    finalColor.rgb -= scanline;

    // Subtle vignette
    vec2 uv = gl_FragCoord.xy / u_canvas_size;
    float vig = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
    float vignette = clamp(16.0 * vig, 0.0, 1.0);
    finalColor.rgb *= (0.75 + 0.25 * vignette);
  }

  // Modern High-Tech Crimson Shutter Death Sequence
  if (u_death_progress > 0.0) {
    vec2 uv = gl_FragCoord.xy / u_canvas_size;
    float slatCount = 14.0;
    float slatIdx = floor(uv.y * slatCount);
    float isOdd = mod(slatIdx, 2.0);

    // Closing phase (0.0 to 0.62)
    float closePhase = clamp(u_death_progress / 0.62, 0.0, 1.0);
    float easeIn = closePhase * closePhase * (3.0 - 2.0 * closePhase);

    // Opening phase (0.85 to 1.0)
    float openPhase = clamp((u_death_progress - 0.85) / 0.15, 0.0, 1.0);
    float easeOut = openPhase * openPhase;

    float progress = easeIn - easeOut;
    float slant = (fract(uv.y * slatCount) - 0.5) * 0.08;

    bool isShutter = false;
    float edgeDist = 0.0;
    if (isOdd > 0.5) {
      float threshold = 1.0 - progress * 1.15 + slant;
      if (uv.x >= threshold) {
        isShutter = true;
        edgeDist = abs(uv.x - threshold);
      }
    } else {
      float threshold = progress * 1.15 + slant;
      if (uv.x <= threshold) {
        isShutter = true;
        edgeDist = abs(uv.x - threshold);
      }
    }

    if (isShutter) {
      vec3 shutterBg = vec3(0.08, 0.01, 0.02);
      float stripe = sin(gl_FragCoord.y * 0.8) * 0.03;
      shutterBg += stripe;

      float laserEdge = exp(-edgeDist * 45.0);
      vec3 edgeColor = vec3(1.0, 0.08, 0.25);

      float glitch = (u_death_progress > 0.62 && u_death_progress < 0.85) ? sin(u_time * 50.0 + uv.y * 20.0) * 0.07 : 0.0;
      finalColor.rgb = mix(shutterBg + glitch, edgeColor, clamp(laserEdge, 0.0, 1.0));
    } else {
      float redWash = clamp(u_death_progress * 1.6, 0.0, 0.7);
      finalColor.r += redWash * 0.4;
      finalColor.gb *= (1.0 - redWash * 0.5);
    }
  }

  // Level Start: Radial iris-open with cyan edge glow
  if (u_level_start_progress > 0.0 && u_level_start_progress < 1.0) {
    vec2 uv = gl_FragCoord.xy / u_canvas_size;
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(uv, center);

    // Iris opens from 0 radius to full diagonal (~0.72)
    float maxRadius = 0.75;
    float t = u_level_start_progress;
    float easedT = t * t * (3.0 - 2.0 * t); // smoothstep
    float radius = easedT * maxRadius;

    if (dist > radius) {
      // Outside iris: dark with subtle scan pattern
      float scan = sin(gl_FragCoord.y * 1.2 + u_time * 12.0) * 0.04;
      finalColor.rgb = vec3(0.02, 0.04, 0.06) + scan;
    }

    // Glowing cyan edge ring
    float edgeDist = abs(dist - radius);
    float edgeGlow = exp(-edgeDist * 35.0) * (1.0 - easedT);
    finalColor.rgb += vec3(0.0, 0.9, 1.0) * edgeGlow * 0.8;
  }

  fragColor = finalColor;
}
`;

