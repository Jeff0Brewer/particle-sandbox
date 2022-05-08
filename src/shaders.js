const shaders = [
    `
    attribute vec4 aPosition;
    attribute vec3 aColor;
    attribute float aSize;

    uniform mat4 uModelMat;
    uniform mat4 uProjMat;
    uniform mat4 uViewMat;

    varying vec4 vColor;

    void main(){
        gl_Position = uProjMat * uViewMat * uModelMat * aPosition;
        gl_PointSize = aSize / gl_Position.w;
        vColor = vec4(aColor, 1.0);
    }`,
    `
    precision highp float;

    varying vec4 vColor;

    void main(){
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        if(dot(cxy, cxy) > 1.0) discard;
        gl_FragColor = vColor;
    }`
];

export default shaders;