import React, { useRef, useEffect, useState } from 'react';
import useWindowSize from '../use-window-size'
import { GlUtil, Mat4 } from '../gl-util'
import shaders from '../shaders'
import './App.css';

const GlParticles = props => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const { height, width } = useWindowSize();

  useEffect(() => {
    const glu = new GlUtil();
    const dpr = window.devicePixelRatio;
    const h = height * dpr, w = width * dpr * .5; 
    let buffer = new Float32Array(props.num * 7);
    let vels = new Float32Array(props.num * 3);
    const fsize = buffer.BYTES_PER_ELEMENT;
    const frameTime = 1000 / props.framerate;

    let fn;
    try {
      fn = new Function('i', props.init);
      for(let i = 0; i < props.num; i++){
        const { pos, col, siz, vel } = fn(i);
        let off = i * 7;
        buffer[off] = pos[0];
        buffer[off + 1] = pos[1];
        buffer[off + 2] = pos[2];
        buffer[off + 3] = col[0];
        buffer[off + 4] = col[1];
        buffer[off + 5] = col[2];
        buffer[off + 6] = siz;
        off = i * 3;
        vels[off] = vel[0];
        vels[off + 1] = vel[1];
        vels[off + 2] = vel[2];
      }
    } catch (err) {
      console.log(err.message);
    }

    const gl = glu.setupGl(canvasRef.current, shaders);
    glu.switchShader(0);
    const viewMat = new Mat4(); 
    const projMat = new Mat4();
    const modelMat = new Mat4();
    viewMat.setCamera([0, 0, 1], [0, 0, 0], [0, 1, 0]);
    projMat.setPerspective(100, w / h, .1, 100);
    const uModelMat = gl.getUniformLocation(gl.program, 'uModelMat');
    gl.uniformMatrix4fv(uModelMat, false, modelMat.e);
    gl.uniformMatrix4fv(gl.getUniformLocation(gl.program, 'uViewMat'), false, viewMat.e);
    gl.uniformMatrix4fv(gl.getUniformLocation(gl.program, 'uProjMat'), false, projMat.e);
    gl.viewport(0, 0, w, h);

    const glBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.DYNAMIC_DRAW)

    const aPosition = gl.getAttribLocation(gl.program, 'aPosition')
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, fsize * 7, 0)
    gl.enableVertexAttribArray(aPosition)
  
    const aColor = gl.getAttribLocation(gl.program, 'aColor')
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, fsize * 7, fsize * 3)
    gl.enableVertexAttribArray(aColor)
  
    const aSize = gl.getAttribLocation(gl.program, 'aSize')
    gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, fsize * 7, fsize * 6)
    gl.enableVertexAttribArray(aSize)

    try {
      fn = new Function('i', 't', 'pos', 'col', 'siz', 'vel', props.update);
    } catch (err) {
      console.log(err.message);
      fn = null;
    }

    const update = t => {
      for(let i = 0; i < props.num; i++){
        let off = i*7;
        const {pos, col, siz, vel} = fn(i, t, buffer.slice(off, off + 3), buffer.slice(off + 3, off + 6), buffer[off + 6], vels.slice(i*3, i*3 + 3));
        buffer[off + 0] = pos[0] + vel[0];
        buffer[off + 1] = pos[1] + vel[1];        
        buffer[off + 2] = pos[2] + vel[2];      
        buffer[off + 3] = col[0];      
        buffer[off + 4] = col[1];      
        buffer[off + 5] = col[2];      
        buffer[off + 6] = siz; 
        off = i * 3;
        vels[off] = vel[0];
        vels[off + 1] = vel[1];
        vels[off + 2] = vel[2];       
      }
    }

    let t = 0;
    let lastTime = Date.now();
    const tick = () => {
      const currTime = Date.now();
      if(currTime - lastTime > frameTime){
        t += (currTime - lastTime)/1000;
        lastTime = currTime;

        if(fn)
          update(t);

        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.DYNAMIC_DRAW)
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, fsize * 7, 0)
        gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, fsize * 7, fsize * 3)
        gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, fsize * 7, fsize * 6)
        gl.drawArrays(gl.POINTS, 0, props.num);
      }

      requestRef.current = window.requestAnimationFrame(tick);
    }
    requestRef.current = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(requestRef.current);
    }
  }, [width, height, props]);

  return (
    <canvas ref={canvasRef} id='gl' width={width * .5 * window.devicePixelRatio} height={height * window.devicePixelRatio}></canvas>
  );
}


const App = () => {
  const initDefault = `//params: i\n\nlet pos = [0, 0, 0];\nlet col = [1, 1, 1];\nlet siz = 10;\nlet vel = [0, 0, 0];\n\nreturn { pos, col, siz, vel };`;
  const [init, setInit] = useState(initDefault);
  const initRef = useRef(null);
  
  const updateDefault = `//params: i, t, pos, col, siz, vel\n\nreturn { pos, col, siz, vel };`;
  const [update, setUpdate] = useState(updateDefault);
  const updateRef = useRef(null);

  const runDelay = 3000;

  let initTimeout = null;
  const delayInit = () => {
    if(initTimeout)
      window.clearTimeout(initTimeout);
    initTimeout = window.setTimeout(() => setInit(initRef.current.value), runDelay);
  }

  let updateTimeout = null;
  const delayUpdate = () => {
    if(updateTimeout)
      window.clearTimeout(updateTimeout);
      updateTimeout = window.setTimeout(() => setUpdate(updateRef.current.value), runDelay);
  }

  useEffect(() => {
    initRef.current.value = initDefault;
    updateRef.current.value = updateDefault;
    setInit(initDefault);
    setUpdate(updateDefault);
  }, [])

  return (
    <main>
      <textarea id='init-code' ref={initRef} className='code-textbox' placeholder='Your init function here' spellCheck='false'
      onChange={() => delayInit()}></textarea>
      <textarea id='update-code' ref={updateRef} className='code-textbox' placeholder='Your update function here' spellCheck='false'
      onChange={() => delayUpdate()}></textarea>
      <GlParticles num={1000} framerate={90} init={init} update={update}/>  
    </main>
  );
}

export default App;
