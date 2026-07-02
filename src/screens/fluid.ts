// WebGL Fluid Simulation — adapted from PavelDoGreat/WebGL-Fluid-Simulation (MIT)
/* eslint-disable @typescript-eslint/no-explicit-any */

export type RGB = [number, number, number];

export interface ThemeConfig {
  bg: RGB;
  colors: RGB[];
  velDiss?: number;
  densDiss?: number;
  vorticity?: number;
}

export interface FluidHandle {
  setTheme(t: ThemeConfig): void;
  splat(x: number, y: number, dx: number, dy: number, color: RGB): void;
  ambientSplat(color: RGB): void;
  destroy(): void;
}

// ── Shaders (GLSL ES 1.00 — works on WebGL1 + WebGL2) ──────────────────────

const BASE_VERT = `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform vec2 texelSize;
  void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const BLUR_VERT = `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  uniform vec2 texelSize;
  void main () {
    vUv = aPosition * 0.5 + 0.5;
    float offset = 1.33333333;
    vL = vUv - texelSize * offset;
    vR = vUv + texelSize * offset;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const BLUR_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  uniform sampler2D uTexture;
  void main () {
    vec4 sum = texture2D(uTexture, vUv) * 0.29411764;
    sum += texture2D(uTexture, vL) * 0.35294117;
    sum += texture2D(uTexture, vR) * 0.35294117;
    gl_FragColor = sum;
  }
`;

const COPY_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  uniform sampler2D uTexture;
  void main () {
    gl_FragColor = texture2D(uTexture, vUv);
  }
`;

const CLEAR_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;
  void main () {
    gl_FragColor = value * texture2D(uTexture, vUv);
  }
`;

const COLOR_FRAG = `
  precision mediump float;
  uniform vec4 color;
  void main () {
    gl_FragColor = color;
  }
`;

const DISPLAY_FRAG = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uTexture;
  uniform sampler2D uBloom;
  uniform sampler2D uSunrays;
  uniform sampler2D uDithering;
  uniform vec2 ditherScale;
  uniform vec2 texelSize;
  vec3 linearToGamma (vec3 c) {
    c = max(c, vec3(0));
    return max(1.055 * pow(c, vec3(0.41666667)) - 0.055, vec3(0));
  }
  void main () {
    vec3 c = texture2D(uTexture, vUv).rgb;
#ifdef SHADING
    vec3 lc = texture2D(uTexture, vL).rgb;
    vec3 rc = texture2D(uTexture, vR).rgb;
    vec3 tc = texture2D(uTexture, vT).rgb;
    vec3 bc = texture2D(uTexture, vB).rgb;
    float dx = length(rc) - length(lc);
    float dy = length(tc) - length(bc);
    vec3 n = normalize(vec3(dx, dy, length(texelSize)));
    float diffuse = clamp(dot(n, vec3(0.0, 0.0, 1.0)) + 0.7, 0.7, 1.0);
    c *= diffuse;
#endif
#ifdef BLOOM
    vec3 bloom = texture2D(uBloom, vUv).rgb;
#endif
#ifdef SUNRAYS
    float sunrays = texture2D(uSunrays, vUv).r;
    c *= sunrays;
#ifdef BLOOM
    bloom *= sunrays;
#endif
#endif
#ifdef BLOOM
    float noise = texture2D(uDithering, vUv * ditherScale).r;
    noise = noise * 2.0 - 1.0;
    bloom += noise / 255.0;
    bloom = linearToGamma(bloom);
    c += bloom;
#endif
    float a = max(c.r, max(c.g, c.b));
    gl_FragColor = vec4(c, a);
  }
`;

const BLOOM_PREFILTER_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec3 curve;
  uniform float threshold;
  void main () {
    vec3 c = texture2D(uTexture, vUv).rgb;
    float br = max(c.r, max(c.g, c.b));
    float rq = clamp(br - curve.x, 0.0, curve.y);
    rq = curve.z * rq * rq;
    c *= max(rq, br - threshold) / max(br, 0.0001);
    gl_FragColor = vec4(c, 0.0);
  }
`;

const BLOOM_BLUR_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uTexture;
  void main () {
    vec4 sum = texture2D(uTexture, vL);
    sum += texture2D(uTexture, vR);
    sum += texture2D(uTexture, vT);
    sum += texture2D(uTexture, vB);
    gl_FragColor = sum * 0.25;
  }
`;

const BLOOM_FINAL_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uTexture;
  uniform float intensity;
  void main () {
    vec4 sum = texture2D(uTexture, vL);
    sum += texture2D(uTexture, vR);
    sum += texture2D(uTexture, vT);
    sum += texture2D(uTexture, vB);
    gl_FragColor = sum * 0.25 * intensity;
  }
`;

const SUNRAYS_MASK_FRAG = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  void main () {
    vec4 c = texture2D(uTexture, vUv);
    float br = max(c.r, max(c.g, c.b));
    c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
    gl_FragColor = c;
  }
`;

const SUNRAYS_FRAG = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float weight;
  #define ITERATIONS 16
  void main () {
    float Density = 0.3;
    float Decay = 0.95;
    float Exposure = 0.7;
    vec2 coord = vUv;
    vec2 dir = (vUv - 0.5) / float(ITERATIONS) * Density;
    float illuminationDecay = 1.0;
    float color = texture2D(uTexture, vUv).a;
    for (int i = 0; i < ITERATIONS; i++) {
      coord -= dir;
      float col = texture2D(uTexture, coord).a;
      color += col * illuminationDecay * weight;
      illuminationDecay *= Decay;
    }
    gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
  }
`;

const SPLAT_FRAG = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;
  void main () {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.0);
  }
`;

const ADVECTION_FRAG = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform vec2 dyeTexelSize;
  uniform float dt;
  uniform float dissipation;
  vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
    vec2 st = uv / tsize - 0.5;
    vec2 iuv = floor(st);
    vec2 fuv = fract(st);
    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
    vec4 c2 = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
    return mix(mix(a, b, fuv.x), mix(c2, d, fuv.x), fuv.y);
  }
  void main () {
#ifdef MANUAL_FILTERING
    vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
    vec4 result = bilerp(uSource, coord, dyeTexelSize);
#else
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
    vec4 result = texture2D(uSource, coord);
#endif
    float decay = 1.0 + dissipation * dt;
    gl_FragColor = result / decay;
  }
`;

const DIVERGENCE_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;
    vec2 C = texture2D(uVelocity, vUv).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }
    gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
  }
`;

const CURL_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
  }
`;

const VORTICITY_FRAG = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;
  void main () {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity += force * dt;
    velocity = clamp(velocity, -1000.0, 1000.0);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

const PRESSURE_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float divergence = texture2D(uDivergence, vUv).x;
    gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
  }
`;

const GRAD_SUB_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

// ── Helpers ─────────────────────────────────────────────────────────────────

function getSupportedFormat(gl: any, internalFormat: number, format: number, type: number): any {
  if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
    switch (internalFormat) {
      case gl.R16F:  return getSupportedFormat(gl, gl.RG16F,   gl.RG,   type);
      case gl.RG16F: return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
      default:       return null;
    }
  }
  return { internalFormat, format };
}

function supportRenderTextureFormat(gl: any, internalFormat: number, format: number, type: number): boolean {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
}

function compileShader(gl: any, type: number, source: string, keywords: string[] | null): any {
  if (keywords && keywords.length) {
    source = keywords.map(k => `#define ${k}\n`).join('') + source;
  }
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Shader error:', gl.getShaderInfoLog(shader));
  }
  return shader;
}

function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return hash;
}

class Program {
  uniforms: Record<string, any> = {};
  program: any;
  constructor(gl: any, vs: any, fs: any) {
    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.warn('Link error:', gl.getProgramInfoLog(this.program));
    }
    const count = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(this.program, i).name;
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
  }
  bind(gl: any) { gl.useProgram(this.program); }
}

class Material {
  private gl: any;
  private vs: any;
  private fragSrc: string;
  private cache: Record<number, Program> = {};
  active: Program | null = null;
  uniforms: Record<string, any> = {};
  constructor(gl: any, vs: any, fragSrc: string) {
    this.gl = gl; this.vs = vs; this.fragSrc = fragSrc;
  }
  setKeywords(kw: string[]) {
    const hash = kw.reduce((h, k) => h + hashCode(k), 0);
    let p = this.cache[hash];
    if (!p) {
      const fs = compileShader(this.gl, this.gl.FRAGMENT_SHADER, this.fragSrc, kw);
      p = new Program(this.gl, this.vs, fs);
      this.cache[hash] = p;
    }
    if (p === this.active) return;
    this.uniforms = p.uniforms;
    this.active = p;
  }
  bind() { this.gl.useProgram(this.active!.program); }
}

function makeNoiseTex(gl: any, w: number, h: number): any {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 255) | 0;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  return {
    texture: tex, width: w, height: h,
    attach(id: number) {
      gl.activeTexture(gl.TEXTURE0 + id);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      return id;
    }
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function createFluid(
  canvas: any,
  initialTheme: ThemeConfig,
  _opts?: { noSeed?: boolean; simW?: number; simH?: number }
): FluidHandle | null {

  const ctxParams = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
  let gl: any = canvas.getContext('webgl2', ctxParams);
  const isWebGL2 = !!gl;
  if (!isWebGL2) gl = canvas.getContext('webgl', ctxParams) || canvas.getContext('experimental-webgl', ctxParams);
  if (!gl) return null;

  let halfFloat: any;
  let supportLinearFiltering: any;
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
  } else {
    halfFloat = gl.getExtension('OES_texture_half_float');
    supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
  }

  const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat?.HALF_FLOAT_OES;
  let formatRGBA: any, formatRG: any, formatR: any;
  if (isWebGL2) {
    formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
    formatRG   = getSupportedFormat(gl, gl.RG16F,   gl.RG,   halfFloatTexType);
    formatR    = getSupportedFormat(gl, gl.R16F,    gl.RED,  halfFloatTexType);
  } else {
    formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatRG   = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatR    = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
  }
  if (!formatRGBA) return null;

  // ── Programs ────────────────────────────────────────────────────────────────

  const baseVert = compileShader(gl, gl.VERTEX_SHADER, BASE_VERT, null);
  const blurVert = compileShader(gl, gl.VERTEX_SHADER, BLUR_VERT, null);

  const blurProg        = new Program(gl, blurVert, compileShader(gl, gl.FRAGMENT_SHADER, BLUR_FRAG, null));
  const copyProg        = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, COPY_FRAG, null));
  const clearProg       = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, CLEAR_FRAG, null));
  const colorProg       = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, COLOR_FRAG, null));
  const bloomPreProg    = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, BLOOM_PREFILTER_FRAG, null));
  const bloomBlurProg   = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, BLOOM_BLUR_FRAG, null));
  const bloomFinalProg  = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, BLOOM_FINAL_FRAG, null));
  const sunMaskProg     = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, SUNRAYS_MASK_FRAG, null));
  const sunraysProg     = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, SUNRAYS_FRAG, null));
  const splatProg       = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, SPLAT_FRAG, null));
  const advProg         = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, ADVECTION_FRAG, supportLinearFiltering ? null : ['MANUAL_FILTERING']));
  const divProg         = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, DIVERGENCE_FRAG, null));
  const curlProg        = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, CURL_FRAG, null));
  const vortProg        = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, VORTICITY_FRAG, null));
  const presProg        = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, PRESSURE_FRAG, null));
  const gsubProg        = new Program(gl, baseVert, compileShader(gl, gl.FRAGMENT_SHADER, GRAD_SUB_FRAG, null));
  const displayMat      = new Material(gl, baseVert, DISPLAY_FRAG);

  // ── Quad ────────────────────────────────────────────────────────────────────

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  function blit(target: any, clear = false) {
    if (target == null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    if (clear) { gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  // ── FBO helpers ─────────────────────────────────────────────────────────────

  function createFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): any {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      texture, fbo, width: w, height: h,
      texelSizeX: 1/w, texelSizeY: 1/h,
      attach(id: number) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      }
    };
  }

  function createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): any {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);
    return {
      width: w, height: h,
      texelSizeX: fbo1.texelSizeX, texelSizeY: fbo1.texelSizeY,
      get read() { return fbo1; },
      set read(v) { fbo1 = v; },
      get write() { return fbo2; },
      set write(v) { fbo2 = v; },
      swap() { const t = fbo1; fbo1 = fbo2; fbo2 = t; }
    };
  }

  function resizeFBO(target: any, w: number, h: number, internalFormat: number, format: number, type: number, param: number): any {
    const n = createFBO(w, h, internalFormat, format, type, param);
    copyProg.bind(gl);
    gl.uniform1i(copyProg.uniforms.uTexture, target.attach(0));
    blit(n);
    return n;
  }

  function resizeDoubleFBO(target: any, w: number, h: number, internalFormat: number, format: number, type: number, param: number): any {
    if (target.width === w && target.height === h) return target;
    target.read  = resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = createFBO(w, h, internalFormat, format, type, param);
    target.width = w; target.height = h;
    target.texelSizeX = 1/w; target.texelSizeY = 1/h;
    return target;
  }

  function getResolution(resolution: number) {
    const dbW = gl.drawingBufferWidth  || canvas.width  || 414;
    const dbH = gl.drawingBufferHeight || canvas.height || 892;
    let ar = dbW / dbH;
    if (ar < 1) ar = 1 / ar;
    const min = Math.round(resolution);
    const max = Math.round(resolution * ar);
    return dbW > dbH ? { width: max, height: min } : { width: min, height: max };
  }

  // ── Config ──────────────────────────────────────────────────────────────────

  const BLOOM       = !!supportLinearFiltering;
  const SUNRAYS     = !!supportLinearFiltering;
  const PRESSURE    = 0.8;
  const PRES_ITER   = 20;
  const SPLAT_FORCE = 6000;
  const SPLAT_RAD   = 0.10;
  const BLOOM_RES   = 256;
  const BLOOM_ITER  = 8;
  const BLOOM_INT   = 0.8;
  const BLOOM_THR   = 0.6;
  const BLOOM_KNEE  = 0.7;
  const SUN_RES     = 196;
  const SUN_WEIGHT  = 1.0;

  // ── FBO state ───────────────────────────────────────────────────────────────

  let dye: any, velocity: any, divergence: any, curl: any, pressure: any;
  let bloom: any, bloomFBOs: any[] = [];
  let sunrays: any, sunraysTemp: any;
  const ditheringTex = makeNoiseTex(gl, 64, 64);

  function initFramebuffers() {
    const simRes = getResolution(128);
    const dyeRes = getResolution(512);
    const texType  = halfFloatTexType;
    const rgba     = formatRGBA;
    const rg       = formatRG;
    const r        = formatR;
    const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);

    dye      = dye      ? resizeDoubleFBO(dye,      dyeRes.width,  dyeRes.height,  rgba.internalFormat, rgba.format, texType, filtering)
                        : createDoubleFBO(           dyeRes.width,  dyeRes.height,  rgba.internalFormat, rgba.format, texType, filtering);
    velocity = velocity ? resizeDoubleFBO(velocity,  simRes.width,  simRes.height,  rg.internalFormat,   rg.format,   texType, filtering)
                        : createDoubleFBO(           simRes.width,  simRes.height,  rg.internalFormat,   rg.format,   texType, filtering);

    divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    curl       = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure   = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);

    if (BLOOM) {
      const br = getResolution(BLOOM_RES);
      bloom = createFBO(br.width, br.height, rgba.internalFormat, rgba.format, texType, filtering);
      bloomFBOs = [];
      for (let i = 0; i < BLOOM_ITER; i++) {
        const w = br.width  >> (i + 1);
        const h = br.height >> (i + 1);
        if (w < 2 || h < 2) break;
        bloomFBOs.push(createFBO(w, h, rgba.internalFormat, rgba.format, texType, filtering));
      }
    }

    if (SUNRAYS) {
      const sr = getResolution(SUN_RES);
      sunrays     = createFBO(sr.width, sr.height, r.internalFormat, r.format, texType, filtering);
      sunraysTemp = createFBO(sr.width, sr.height, r.internalFormat, r.format, texType, filtering);
    }
  }

  const kw: string[] = ['SHADING'];
  if (BLOOM)   kw.push('BLOOM');
  if (SUNRAYS) kw.push('SUNRAYS');
  displayMat.setKeywords(kw);
  initFramebuffers();

  // ── Theme ───────────────────────────────────────────────────────────────────

  let theme = initialTheme;

  // ── Splat ───────────────────────────────────────────────────────────────────

  function correctRadius(r: number) {
    const ar = canvas.width / canvas.height;
    return ar > 1 ? r * ar : r;
  }

  function doSplat(x: number, y: number, dx: number, dy: number, r: number, g: number, b: number) {
    splatProg.bind(gl);
    gl.uniform1i(splatProg.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatProg.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProg.uniforms.point, x, y);
    gl.uniform3f(splatProg.uniforms.color, dx, dy, 0);
    gl.uniform1f(splatProg.uniforms.radius, correctRadius(SPLAT_RAD / 100));
    blit(velocity.write);
    velocity.swap();

    gl.uniform1i(splatProg.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProg.uniforms.color, r, g, b);
    blit(dye.write);
    dye.swap();
  }

  function seedSplats(count: number) {
    for (let i = 0; i < count; i++) {
      const c = theme.colors[Math.floor(Math.random() * theme.colors.length)];
      doSplat(
        Math.random(), Math.random(),
        1000 * (Math.random() - 0.5),
        1000 * (Math.random() - 0.5),
        c[0] * 10, c[1] * 10, c[2] * 10
      );
    }
  }

  seedSplats(15);

  // ── Simulation step ─────────────────────────────────────────────────────────

  function step(dt: number) {
    gl.disable(gl.BLEND);

    curlProg.bind(gl);
    gl.uniform2f(curlProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlProg.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl);

    vortProg.bind(gl);
    gl.uniform2f(vortProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vortProg.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vortProg.uniforms.uCurl,     curl.attach(1));
    gl.uniform1f(vortProg.uniforms.curl, theme.vorticity ?? 30);
    gl.uniform1f(vortProg.uniforms.dt,   dt);
    blit(velocity.write);
    velocity.swap();

    divProg.bind(gl);
    gl.uniform2f(divProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divProg.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);

    clearProg.bind(gl);
    gl.uniform1i(clearProg.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearProg.uniforms.value, PRESSURE);
    blit(pressure.write);
    pressure.swap();

    presProg.bind(gl);
    gl.uniform2f(presProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(presProg.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < PRES_ITER; i++) {
      gl.uniform1i(presProg.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    gsubProg.bind(gl);
    gl.uniform2f(gsubProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gsubProg.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(gsubProg.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    advProg.bind(gl);
    gl.uniform2f(advProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    if (!supportLinearFiltering)
      gl.uniform2f(advProg.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    const vId = velocity.read.attach(0);
    gl.uniform1i(advProg.uniforms.uVelocity, vId);
    gl.uniform1i(advProg.uniforms.uSource,   vId);
    gl.uniform1f(advProg.uniforms.dt,         dt);
    gl.uniform1f(advProg.uniforms.dissipation, theme.velDiss ?? 0.2);
    blit(velocity.write);
    velocity.swap();

    if (!supportLinearFiltering)
      gl.uniform2f(advProg.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(advProg.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advProg.uniforms.uSource,   dye.read.attach(1));
    gl.uniform1f(advProg.uniforms.dissipation, theme.densDiss ?? 1.0);
    blit(dye.write);
    dye.swap();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  function applyBloom(source: any, dest: any) {
    if (bloomFBOs.length < 2) return;
    let last = dest;
    gl.disable(gl.BLEND);
    bloomPreProg.bind(gl);
    const knee = BLOOM_THR * BLOOM_KNEE + 0.0001;
    gl.uniform3f(bloomPreProg.uniforms.curve, BLOOM_THR - knee, knee * 2, 0.25 / knee);
    gl.uniform1f(bloomPreProg.uniforms.threshold, BLOOM_THR);
    gl.uniform1i(bloomPreProg.uniforms.uTexture, source.attach(0));
    blit(last);

    bloomBlurProg.bind(gl);
    for (let i = 0; i < bloomFBOs.length; i++) {
      const d = bloomFBOs[i];
      gl.uniform2f(bloomBlurProg.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
      gl.uniform1i(bloomBlurProg.uniforms.uTexture, last.attach(0));
      blit(d);
      last = d;
    }

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);
    for (let i = bloomFBOs.length - 2; i >= 0; i--) {
      const b = bloomFBOs[i];
      gl.uniform2f(bloomBlurProg.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
      gl.uniform1i(bloomBlurProg.uniforms.uTexture, last.attach(0));
      gl.viewport(0, 0, b.width, b.height);
      blit(b);
      last = b;
    }

    gl.disable(gl.BLEND);
    bloomFinalProg.bind(gl);
    gl.uniform2f(bloomFinalProg.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
    gl.uniform1i(bloomFinalProg.uniforms.uTexture, last.attach(0));
    gl.uniform1f(bloomFinalProg.uniforms.intensity, BLOOM_INT);
    blit(dest);
  }

  function applySunrays(source: any, mask: any, dest: any) {
    gl.disable(gl.BLEND);
    sunMaskProg.bind(gl);
    gl.uniform1i(sunMaskProg.uniforms.uTexture, source.attach(0));
    blit(mask);

    sunraysProg.bind(gl);
    gl.uniform1f(sunraysProg.uniforms.weight, SUN_WEIGHT);
    gl.uniform1i(sunraysProg.uniforms.uTexture, mask.attach(0));
    blit(dest);
  }

  function blurPass(target: any, temp: any, iterations: number) {
    blurProg.bind(gl);
    for (let i = 0; i < iterations; i++) {
      gl.uniform2f(blurProg.uniforms.texelSize, target.texelSizeX, 0);
      gl.uniform1i(blurProg.uniforms.uTexture, target.attach(0));
      blit(temp);
      gl.uniform2f(blurProg.uniforms.texelSize, 0, target.texelSizeY);
      gl.uniform1i(blurProg.uniforms.uTexture, temp.attach(0));
      blit(target);
    }
  }

  function render() {
    if (BLOOM)   applyBloom(dye.read, bloom);
    if (SUNRAYS) { applySunrays(dye.read, dye.write, sunrays); blurPass(sunrays, sunraysTemp, 1); }

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    const bg = theme.bg;
    colorProg.bind(gl);
    gl.uniform4f(colorProg.uniforms.color, bg[0], bg[1], bg[2], 1);
    blit(null);

    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    displayMat.bind();
    if (displayMat.uniforms.texelSize)
      gl.uniform2f(displayMat.uniforms.texelSize, 1/w, 1/h);
    gl.uniform1i(displayMat.uniforms.uTexture, dye.read.attach(0));
    if (BLOOM && displayMat.uniforms.uBloom) {
      gl.uniform1i(displayMat.uniforms.uBloom,     bloom.attach(1));
      gl.uniform1i(displayMat.uniforms.uDithering, ditheringTex.attach(2));
      gl.uniform2f(displayMat.uniforms.ditherScale, w / ditheringTex.width, h / ditheringTex.height);
    }
    if (SUNRAYS && displayMat.uniforms.uSunrays)
      gl.uniform1i(displayMat.uniforms.uSunrays, sunrays.attach(3));
    blit(null);
  }

  // ── Loop ────────────────────────────────────────────────────────────────────

  let lastT = -1;
  let rafId = 0;

  function loop(now: number) {
    if (lastT < 0) lastT = now;
    const dt = Math.min((now - lastT) / 1000, 0.016666);
    lastT = now;

    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round((canvas.clientWidth  || 414) * dpr);
    const ch = Math.round((canvas.clientHeight || 892) * dpr);
    if ((cw > 0 && canvas.width !== cw) || (ch > 0 && canvas.height !== ch)) {
      canvas.width  = cw;
      canvas.height = ch;
      initFramebuffers();
    }

    step(dt);
    render();
    rafId = requestAnimationFrame(loop);
  }

  rafId = requestAnimationFrame(loop);

  return {
    setTheme(t) { theme = t; },
    splat(x, y, dx, dy, color) {
      doSplat(x, y, dx * SPLAT_FORCE, dy * SPLAT_FORCE, color[0], color[1], color[2]);
    },
    ambientSplat(color) {
      doSplat(
        Math.random(), Math.random(),
        (Math.random() - 0.5) * 1000,
        (Math.random() - 0.5) * 1000,
        color[0], color[1], color[2]
      );
    },
    destroy() { cancelAnimationFrame(rafId); },
  };
}
