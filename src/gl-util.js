// gl helper class
const GlUtil = function () {
    this.programs = []
    this.framebuffers = [[null, null]]
}

// load shader from string
GlUtil.prototype.loadShader = function (type, source) {
    const s = this.gl.createShader(type)
    this.gl.shaderSource(s, source)
    this.gl.compileShader(s)
    return s
}

// create gl program from strings
GlUtil.prototype.createProgram = function (vs, fs) {
    const p = this.gl.createProgram()
    const v = this.loadShader(this.gl.VERTEX_SHADER, vs)
    const f = this.loadShader(this.gl.FRAGMENT_SHADER, fs)
    this.gl.attachShader(p, v)
    this.gl.attachShader(p, f)
    this.gl.linkProgram(p)
    return p
}

// switch to another shader program
GlUtil.prototype.switchShader = function (i) {
    this.gl.useProgram(this.programs[i])
    this.gl.program = this.programs[i]
}

// initialize gl context
GlUtil.prototype.setupGl = function (canvas, shaders) {
    this.gl = canvas.getContext('webgl', { preserveDrawingBuffer: false })
    this.gl.disable(this.gl.BLEND)
    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.clearColor(0, 0, 0, 0)
    for (let i = 0; i < shaders.length; i += 2) {
        this.programs.push(this.createProgram(shaders[i], shaders[i + 1]))
    }
    return this.gl
}

// make a texture framebuffer and add to framebuffer list, return index of fb in list
GlUtil.prototype.makeTextureFramebuffer = function (w, h) {
    const tex = this.gl.createTexture()
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex)
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, w, h, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
    
    const fb = this.gl.createFramebuffer()
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb)
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, tex, 0)
    
    const depthBuffer = this.gl.createRenderbuffer()
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, depthBuffer)
    this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, w, h)
    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, depthBuffer)
    
    this.framebuffers.push([fb, tex])
    return this.framebuffers.length - 1
}

// switch to another framebuffer
GlUtil.prototype.switchFramebuffer = function (i) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffers[i][0])
    if (i !== 0) this.gl.bindTexture(this.gl.TEXTURE_2D, this.framebuffers[i][1])
}

// remove a framebuffer by index
GlUtil.prototype.removeFramebuffer = function (i) {
    this.framebuffers.splice(i)
}

// 4x4 matrix class
const Mat4 = function () {
    this.e = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
}

// create persepctive matrix
Mat4.prototype.setPerspective = function (fovy, aspect, near, far) {
    fovy = Math.PI * fovy / 180 / 2
    const rd = 1 / (far - near)
    const ct = Math.cos(fovy) / Math.sin(fovy)
    
    this.e[0] = ct / aspect
    this.e[1] = 0
    this.e[2] = 0
    this.e[3] = 0
    this.e[4] = 0
    this.e[5] = ct
    this.e[6] = 0
    this.e[7] = 0
    this.e[8] = 0
    this.e[9] = 0
    this.e[10] = -(far + near) * rd
    this.e[11] = -1
    this.e[12] = 0
    this.e[13] = 0
    this.e[14] = -2 * near * far * rd
    this.e[15] = 0
}

// create view matrix
Mat4.prototype.setCamera = function (camera, focus, up) {
    const f = norm(sub(focus, camera))
    const s = norm(cross3(f, up))
    const u = cross3(s, f)
    
    this.e[0] = s[0]
    this.e[1] = u[0]
    this.e[2] = -f[0]
    this.e[3] = 0
    this.e[4] = s[1]
    this.e[5] = u[1]
    this.e[6] = -f[1]
    this.e[7] = 0
    this.e[8] = s[2]
    this.e[9] = u[2]
    this.e[10] = -f[2]
    this.e[11] = 0
    this.e[12] = 0
    this.e[13] = 0
    this.e[14] = 0
    this.e[15] = 1
    
    this.translate(-camera[0], -camera[1], -camera[2])
}

// scale transformation matrix in x, y, z
Mat4.prototype.scale = function (x, y, z) {
    this.e[0] *= x
    this.e[1] *= x
    this.e[2] *= x
    this.e[3] *= x
    this.e[4] *= y
    this.e[5] *= y
    this.e[6] *= y
    this.e[7] *= y
    this.e[8] *= z
    this.e[9] *= z
    this.e[10] *= z
    this.e[11] *= z
}

// translate transformation matrix by x, y, z
Mat4.prototype.translate = function (x, y, z) {
    this.e[12] += this.e[0] * x + this.e[4] * y + this.e[8] * z
    this.e[13] += this.e[1] * x + this.e[5] * y + this.e[9] * z
    this.e[14] += this.e[2] * x + this.e[6] * y + this.e[10] * z
    this.e[15] += this.e[3] * x + this.e[7] * y + this.e[11] * z
}

// multiply vector by scalar
function multScalar (vec, s) {
    return vec.map(el => el * s)
}

// find difference of two vectors
function sub (a, b) {
    return a.map((el, i) => el - b[i])
}

// find magnitude of vector
function mag (vec) {
    let s = 0
    vec.forEach(el => { s += el * el })
    return Math.sqrt(s)
}

// find normal of vector
function norm (vec) {
    return multScalar(vec, 1 / mag(vec))
}

// find cross product of 3d vectors
function cross3 (a, b) {
    return [a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]]
}

export {
    GlUtil,
    Mat4
}
