const controller = renderer.xr.getController(0);
scene.add(controller);

  const oldRay = scene.getObjectByName("rayLine");
  if (oldRay) scene.remove(oldRay);

  // Position et direction du contrôleur
  const origin = controller.position;
  const direction = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();

  // Obtenir l'origine et la direction à partir du contrôleur  
  controller.getWorldQuaternion(quaternion);
  direction.set(0, 0, -1).applyQuaternion(quaternion).normalize();

  // Calcul d'un point plus loin sur le rayon
  const length = 20;
  // cette ligne réalise une somme de vecteurs: le vecteur origine + un vecteur de longueur length colinéaire à la direction de la manette
  const end = origin.clone().add(direction.clone().multiplyScalar(length));

  // Créer une ligne verte
  // Buffergeometry est une géométrie de bas niveau où l'utilisateur définit lui-même les sommets( vertices)
  const rayGeometry = new THREE.BufferGeometry().setFromPoints([origin, end]);
  const rayMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  const rayLine = new THREE.Line(rayGeometry, rayMaterial);
  rayLine.name = "rayLine";
  scene.add(rayLine);

  // Supprimer l’ancien marqueur si besoin
  const oldMarker = scene.getObjectByName("rayEndMarker");
  if (oldMarker) scene.remove(oldMarker);

  // Ajouter une sphère  à l'extrémité du rayon
  const markerGeometry = new THREE.SphereGeometry(0.5, 16, 16);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const marker = new THREE.Mesh(markerGeometry, markerMaterial);
  marker.name = "rayEndMarker";
  marker.position.copy(end);
  scene.add(marker); 

function onSelect() {
  const origin = controller.position;
  const direction = new THREE.Vector3();
  const quaternion = new THREE.Quaternion(); 
  controller.getWorldQuaternion(quaternion);
  direction.set(0, 0, -1).applyQuaternion(quaternion).normalize();

  // 🔧 Mise à jour nécessaire des matrices
  // scene.updateMatrixWorld(true);

  raycaster.set(origin, direction);

  const intersects = raycaster.intersectObject(cube);

  console.log(intersects);

  if (intersects.length > 0) {
    const target = intersects[0].object;
    if (target === cube) {
      target.material.color.set(Math.random() * 0xffffff);
      infoSprite.render(-3,0,-5, scene);
    }
  } else {
    console.log("Vous n'avez pas cliqué sur le cube");
  }
}

// Ajout d’un événement "select"
controller.addEventListener("select", onSelect);