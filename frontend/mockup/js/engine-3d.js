/**
 * engine-3d.js — Three.js procedural Francis turbine geometry
 * Dependency: config.js, store.js (Three.js r128 global)
 *
 * Two-container support: #full-3d (expanded) and #monitor-3d (preview)
 */
(function() {
  'use strict';
  var S = window.FrancisSCADA;

  var scene, camera, renderer, controls;
  var activeContainer = null;
  var runnerGroup, wicketGatesGroup, generatorGroup, particlesGroup;
  var particlePositions, particleSpeeds;
  var layers = {
    casing: true, vanes: true, runner: true, particles: true,
    axes: true, glb: false, autorotate: true,
  };
  var animFrameId = null;
  var disposed = false;
  var glbModel = null;

  S.Engine3D = {
    init: function(containerId) {
      try {
        if (disposed) return;
        initScene(containerId);
      } catch (e) {
        console.error('[Engine3D] Init error:', e);
      }
    },

    update: function(telemetry) {
      try {
        if (!scene || disposed) return;
        var rpm = telemetry.rpm || 0;
        var flow = telemetry.flow || 0;
        var gateActual = telemetry.gate_actual || 0;
        var dt = S.CFG.dt;
        var now = performance.now() / 1000;

        // Rotate runner + generator
        if (runnerGroup) {
          runnerGroup.rotation.y += (rpm / 60) * dt * 2 * Math.PI;
        }
        if (generatorGroup) {
          generatorGroup.rotation.y += (rpm / 60) * dt * 2 * Math.PI;
        }

        // Wicket gates angle
        if (wicketGatesGroup) {
          // Map gate 0→100% to angle closed→open
          var gateAngle = (1 - gateActual / 100) * Math.PI / 3;
          for (var i = 0; i < wicketGatesGroup.children.length; i++) {
            wicketGatesGroup.children[i].rotation.z = gateAngle;
          }
        }

        // Particles
        if (particlesGroup && layers.particles) {
          var speed = 0.004 + flow * 0.01;
          if (particlePositions) {
            for (var pi = 0; pi < particlePositions.length; pi += 3) {
              particlePositions[pi + 1] -= speed * (dt * 30);
              if (particlePositions[pi + 1] < -2.5) {
                particlePositions[pi + 1] = 1.5;
              }
            }
            particlesGroup.geometry.attributes.position.needsUpdate = true;
          }
        }
      } catch (e) {
        console.error('[Engine3D] Update error:', e);
      }
    },

    setCamera: function(preset) {
      try {
        if (!camera || !controls) return;
        switch (preset) {
          case 'iso':
            camera.position.set(5, 4, 6);
            controls.target.set(0, 0, 0);
            break;
          case 'runner':
            camera.position.set(0, -0.5, 2.5);
            controls.target.set(0, 0, 0);
            break;
          case 'top':
            camera.position.set(0, 6, 0.1);
            controls.target.set(0, 0, 0);
            break;
          case 'cut':
            camera.position.set(2.5, 1, 0.1);
            controls.target.set(0, 0, 0);
            break;
        }
        controls.update();
      } catch (e) {
        console.error('[Engine3D] setCamera error:', e);
      }
    },

    toggleLayer: function(name, visible) {
      layers[name] = visible;
      applyLayerVisibility();
    },

    /**
     * Move canvas to another container.
     */
    switchContainer: function(containerId) {
      try {
        if (!renderer) return;
        var newContainer = document.getElementById(containerId);
        if (!newContainer) return;
        if (activeContainer) {
          // Remove canvas from old
          var canvas = renderer.domElement;
          if (canvas && canvas.parentElement) {
            canvas.parentElement.removeChild(canvas);
          }
        }
        newContainer.innerHTML = '';
        newContainer.appendChild(renderer.domElement);
        activeContainer = containerId;
        resizeRenderer();
      } catch (e) {
        console.error('[Engine3D] switchContainer error:', e);
      }
    },

    dispose: function() {
      try {
        disposed = true;
        if (animFrameId) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
        if (renderer) {
          renderer.dispose();
          renderer = null;
        }
        if (scene) {
          disposeScene(scene);
          scene = null;
        }
        camera = null;
        controls = null;
        activeContainer = null;
      } catch (e) {
        console.error('[Engine3D] dispose error:', e);
      }
    },
  };

  // ── Internal helpers ────────────────────────────────────────────

  function initScene(containerId) {
    var container = document.getElementById(containerId);
    if (!container) {
      console.warn('[Engine3D] Container not found:', containerId);
      return;
    }

    activeContainer = containerId;
    var w = container.clientWidth || 800;
    var h = container.clientHeight || 600;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.Fog(0x0f172a, 12, 25);

    // Camera
    camera = new THREE.PerspectiveCamera(45, w / h, 0.5, 50);
    camera.position.set(5, 4, 6);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0x404066, 0.4));
    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 5, 3);
    dirLight.castShadow = true;
    scene.add(dirLight);
    var pointCyan = new THREE.PointLight(0x00d4ff, 0.6, 10);
    pointCyan.position.set(0, 2, 3);
    scene.add(pointCyan);
    var pointAmber = new THREE.PointLight(0xf59e0b, 0.3, 8);
    pointAmber.position.set(0, -1, 0);
    scene.add(pointAmber);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controls.autoRotate = layers.autorotate;
    controls.autoRotateSpeed = 0.5;

    // Build geometry
    buildTurbine();

    // Load decorative GLB
    loadGLB();

    // Start render loop
    animate();

    console.log('[Engine3D] Initialized in', containerId);
  }

  function buildTurbine() {
    // ── CARCASA (spiral volute) ──────────────────────────────────
    // Archimedean spiral: R(θ) = R0 + k * θ
    var spiralPoints = [];
    var R0 = 1.6, k = 0.15, turns = 1.0;
    var segs = 80;
    for (var s = 0; s <= segs; s++) {
      var theta = turns * 2 * Math.PI * (s / segs);
      var r = R0 + k * theta;
      var x = r * Math.cos(theta);
      var z = r * Math.sin(theta);
      spiralPoints.push(new THREE.Vector3(x, 0.5, z));
    }
    var spiralCurve = new THREE.CatmullRomCurve3(spiralPoints);
    var tubeGeo = new THREE.TubeGeometry(spiralCurve, 64, 0.25, 16, false);
    var casingMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      metalness: 0.8,
      roughness: 0.3,
    });
    var casing = new THREE.Mesh(tubeGeo, casingMat);
    casing.name = 'casing';
    casing.castShadow = true;
    casing.receiveShadow = true;
    scene.add(casing);

    // Outer torus as visual reinforcement
    var torusOuter = new THREE.TorusGeometry(1.8, 0.08, 16, 48);
    var torusWire = new THREE.Mesh(torusOuter, new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.9,
      roughness: 0.2,
      wireframe: false,
    }));
    torusWire.rotation.x = Math.PI / 2;
    torusWire.position.y = 0.55;
    torusWire.name = 'casing-ring';
    scene.add(torusWire);

    // ── STAY VANES (fixed guide vanes, 12 pieces) ─────────────────
    var stayVanesGroup = new THREE.Group();
    stayVanesGroup.name = 'stayVanes';
    for (var vi = 0; vi < 12; vi++) {
      var angle = (vi / 12) * Math.PI * 2;
      var vane = createHydrofoil();
      vane.position.set(Math.cos(angle) * 1.4, 0.5, Math.sin(angle) * 1.4);
      vane.rotation.y = -angle + Math.PI / 2;
      vane.rotation.z = 0.26; // ~15° stagger
      stayVanesGroup.add(vane);
    }
    scene.add(stayVanesGroup);

    // ── WICKET GATES (movable guide vanes, 12 pieces) ────────────
    wicketGatesGroup = new THREE.Group();
    wicketGatesGroup.name = 'wicketGates';
    for (var wi = 0; wi < 12; wi++) {
      var wangle = (wi / 12) * Math.PI * 2;
      var gate = createHydrofoil(true);
      gate.position.set(Math.cos(wangle) * 1.2, 0.3, Math.sin(wangle) * 1.2);
      gate.rotation.y = -wangle + Math.PI / 2;
      wicketGatesGroup.add(gate);
    }
    scene.add(wicketGatesGroup);

    // ── RUNNER ──────────────────────────────────────────────────
    runnerGroup = new THREE.Group();
    runnerGroup.name = 'runner';
    runnerGroup.position.y = -0.2;

    // Hub (truncated cone)
    var hubGeo = new THREE.CylinderGeometry(0.3, 0.45, 0.9, 24);
    var hubMat = new THREE.MeshPhongMaterial({
      color: 0xcd7f32,
      shininess: 60,
      specular: 0x442200,
    });
    var hub = new THREE.Mesh(hubGeo, hubMat);
    hub.castShadow = true;
    runnerGroup.add(hub);

    // Crown (top torus)
    var crownGeo = new THREE.TorusGeometry(0.48, 0.06, 16, 24);
    var crown = new THREE.Mesh(crownGeo, hubMat);
    crown.position.y = 0.45;
    crown.rotation.x = Math.PI / 2;
    runnerGroup.add(crown);

    // Band (bottom torus)
    var bandGeo = new THREE.TorusGeometry(0.48, 0.06, 16, 24);
    var band = new THREE.Mesh(bandGeo, hubMat);
    band.position.y = -0.45;
    band.rotation.x = Math.PI / 2;
    runnerGroup.add(band);

    // Runner blades (9-13 curved blades)
    var numBlades = 11; // ~11300/9
    for (var bi = 0; bi < numBlades; bi++) {
      var bladeAngle = (bi / numBlades) * Math.PI * 2;
      var blade = createRunnerBlade();
      blade.position.y = 0;
      blade.rotation.y = bladeAngle;
      runnerGroup.add(blade);
    }
    scene.add(runnerGroup);

    // ── DRAFT TUBE ──────────────────────────────────────────────
    var draftGeo = new THREE.ConeGeometry(1.3, 1.6, 20, 1, true);
    var draftMat = new THREE.MeshStandardMaterial({
      color: 0x0c4a6e,
      metalness: 0.3,
      roughness: 0.6,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    var draftTube = new THREE.Mesh(draftGeo, draftMat);
    draftTube.position.y = -1.2;
    draftTube.name = 'draftTube';
    scene.add(draftTube);

    // ── GENERATOR ────────────────────────────────────────────────
    generatorGroup = new THREE.Group();
    generatorGroup.name = 'generator';
    generatorGroup.position.y = 1.2;

    // Shaft
    var shaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 16);
    var shaftMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.5,
      roughness: 0.4,
      emissive: 0x331100,
      emissiveIntensity: 0.2,
    });
    var shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 0.6;
    generatorGroup.add(shaft);

    // Rotor
    var rotorGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.7, 32);
    var rotorMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.4,
    });
    var rotor = new THREE.Mesh(rotorGeo, rotorMat);
    rotor.position.y = 1.4;
    rotor.castShadow = true;
    generatorGroup.add(rotor);

    scene.add(generatorGroup);

    // ── PARTICLES ────────────────────────────────────────────────
    var numParticles = 500;
    var pGeo = new THREE.BufferGeometry();
    particlePositions = new Float32Array(numParticles * 3);
    particleSpeeds = new Float32Array(numParticles);
    for (var p = 0; p < numParticles; p++) {
      var pAngle = Math.random() * Math.PI * 2;
      var pRadius = 0.7 + Math.random() * 2.0;
      particlePositions[p * 3] = Math.cos(pAngle) * pRadius;
      particlePositions[p * 3 + 1] = -1.5 + Math.random() * 3.0;
      particlePositions[p * 3 + 2] = Math.sin(pAngle) * pRadius;
      particleSpeeds[p] = 0.3 + Math.random() * 0.7;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    var pMat = new THREE.PointsMaterial({
      color: 0x00d4ff,
      size: 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.7,
    });
    particlesGroup = new THREE.Points(pGeo, pMat);
    particlesGroup.name = 'particles';
    scene.add(particlesGroup);

    // ── AXES ─────────────────────────────────────────────────────
    var axesGroup = new THREE.Group();
    axesGroup.name = 'axes';
    // Y-axis arrow (amber)
    var arrowY = createArrow(0xf59e0b, 3);
    axesGroup.add(arrowY);
    // Small X & Z
    var arrowX = createArrow(0xef4444, 1.5);
    arrowX.rotation.z = -Math.PI / 2;
    axesGroup.add(arrowX);
    var arrowZ = createArrow(0x3b82f6, 1.5);
    arrowZ.rotation.x = Math.PI / 2;
    axesGroup.add(arrowZ);
    axesGroup.position.set(-3, -1.5, -3);
    scene.add(axesGroup);
  }

  function createHydrofoil(movable) {
    // Simple NACA-like hydrofoil profile as a thin box (stylized)
    var group = new THREE.Group();
    var bodyGeo = new THREE.BoxGeometry(0.06, 0.5, 0.12);
    var bodyMat = new THREE.MeshStandardMaterial({
      color: movable ? 0x94a3b8 : 0x64748b,
      metalness: 0.7,
      roughness: 0.3,
    });
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.25;
    body.castShadow = true;
    group.add(body);
    return group;
  }

  function createRunnerBlade() {
    // Curved blade shape using a bent box geometry
    var group = new THREE.Group();
    var bladeGeo = new THREE.BoxGeometry(0.06, 0.7, 0.28);
    var bladeMat = new THREE.MeshPhongMaterial({
      color: 0xdaa520,
      shininess: 70,
      specular: 0x664400,
    });
    var blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.rotation.x = 0.3; // tilt
    blade.position.y = 0;
    blade.castShadow = true;
    group.add(blade);
    return group;
  }

  function createArrow(color, length) {
    var group = new THREE.Group();
    var shaftGeo = new THREE.CylinderGeometry(0.03, 0.03, length, 8);
    var shaftMat = new THREE.MeshBasicMaterial({ color: color });
    var shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = length / 2;
    group.add(shaft);
    var headGeo = new THREE.ConeGeometry(0.08, 0.2, 8);
    var head = new THREE.Mesh(headGeo, shaftMat);
    head.position.y = length;
    group.add(head);
    return group;
  }

  function loadGLB() {
    if (typeof THREE.GLTFLoader === 'undefined') {
      console.log('[Engine3D] GLTFLoader not available, skipping GLB');
      return;
    }
    var loader = new THREE.GLTFLoader();
    loader.load(
      '../public/turbina.glb',
      function(gltf) {
        glbModel = gltf.scene;
        glbModel.scale.set(0.4, 0.4, 0.4);
        glbModel.position.y = 0;
        glbModel.name = 'glb-decorative';
        glbModel.visible = layers.glb;
        scene.add(glbModel);
        console.log('[Engine3D] GLB loaded');
      },
      undefined,
      function(err) {
        console.warn('[Engine3D] GLB load failed (decorative only):', err.message || err);
      }
    );
  }

  function applyLayerVisibility() {
    if (!scene) return;
    scene.traverse(function(obj) {
      if (obj.name === 'casing' || obj.name === 'casing-ring') {
        obj.visible = layers.casing;
      }
      if (obj.name === 'stayVanes') {
        obj.visible = layers.vanes;
      }
      if (obj.name === 'wicketGates') {
        obj.visible = layers.vanes;
      }
      if (obj.name === 'runner') {
        obj.visible = layers.runner;
      }
      if (obj.name === 'particles') {
        obj.visible = layers.particles;
      }
      if (obj.name === 'axes') {
        obj.visible = layers.axes;
      }
      if (obj.name === 'glb-decorative') {
        obj.visible = layers.glb;
      }
    });
    if (controls) {
      controls.autoRotate = layers.autorotate;
    }
  }

  function resizeRenderer() {
    if (!renderer || !activeContainer) return;
    var container = document.getElementById(activeContainer);
    if (!container) return;
    var w = container.clientWidth || 800;
    var h = container.clientHeight || 600;
    if (camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    renderer.setSize(w, h);
  }

  function animate() {
    if (disposed) return;
    animFrameId = requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function disposeScene(obj) {
    if (!obj) return;
    obj.traverse(function(child) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(function(m) { m.dispose(); });
        } else {
          child.material.dispose();
        }
      }
    });
  }

})();