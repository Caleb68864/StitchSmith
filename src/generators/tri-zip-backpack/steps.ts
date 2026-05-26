import type { Step } from '../../lib/pattern-engine/instructions/Step.js';

export function backPanelSteps(): Step[] {
  return [
    {
      id: 'tri-zip.back-panel.cut',
      title: 'Cut back panel',
      body: 'Cut the back panel piece to the marked dimensions including seam allowance.',
      dependsOn: [],
      refsPieces: ['back-panel'],
      group: 'Back Panel',
    },
    {
      id: 'tri-zip.back-panel.attach-straps',
      title: 'Attach shoulder strap anchor points',
      body: 'Bartack or box-stitch the strap attachment webbing loops to the back panel upper corners.',
      dependsOn: ['tri-zip.back-panel.cut', 'tri-zip.shoulder-straps.cut'],
      refsPieces: ['back-panel', 'shoulder-strap'],
      group: 'Back Panel',
    },
  ];
}

export function frontCenterPanelSteps(): Step[] {
  return [
    {
      id: 'tri-zip.front-center.cut',
      title: 'Cut front center panel',
      body: 'Cut the front center panel with the Y-zip opening shape marked.',
      dependsOn: [],
      refsPieces: ['front-center-panel'],
      group: 'Front Assembly',
    },
    {
      id: 'tri-zip.front-center.attach-zipper',
      title: 'Attach center zipper to front center panel',
      body: 'Pin the center-zip tape to the center-panel edge, baste, then stitch at [[piece:front-center-panel]] with 6 mm seam.',
      dependsOn: ['tri-zip.front-center.cut', 'tri-zip.tri-zip-subsystem.assemble'],
      refsPieces: ['front-center-panel', 'tri-zip-subsystem'],
      group: 'Front Assembly',
    },
  ];
}

export function frontWingSteps(): Step[] {
  return [
    {
      id: 'tri-zip.front-wing.cut',
      title: 'Cut front wings (mirror pair)',
      body: 'Cut two front wing pieces (one mirrored). Mark the Y-split intersection point on the interior edge.',
      dependsOn: [],
      refsPieces: ['front-wing'],
      group: 'Front Assembly',
    },
    {
      id: 'tri-zip.front-wing.attach-zipper',
      title: 'Attach diagonal zipper to front wings',
      body: 'Stitch the diagonal zip tapes to each front wing interior edge, starting at the Y-split point.',
      dependsOn: ['tri-zip.front-wing.cut', 'tri-zip.tri-zip-subsystem.assemble'],
      refsPieces: ['front-wing', 'tri-zip-subsystem'],
      group: 'Front Assembly',
    },
  ];
}

export function perimeterGussetSteps(): Step[] {
  return [
    {
      id: 'tri-zip.gusset.cut',
      title: 'Cut perimeter gusset',
      body: 'Cut gusset strip(s) to computed length. Notch at corners.',
      dependsOn: [],
      refsPieces: ['perimeter-gusset'],
      group: 'Gusset',
    },
    {
      id: 'tri-zip.gusset.attach',
      title: 'Attach gusset to back panel',
      body: 'Pin gusset to back panel starting at bottom center. Ease corners. Stitch.',
      dependsOn: ['tri-zip.back-panel.cut', 'tri-zip.gusset.cut'],
      refsPieces: ['back-panel', 'perimeter-gusset'],
      group: 'Gusset',
    },
  ];
}

export function triZipSubsystemSteps(): Step[] {
  return [
    {
      id: 'tri-zip.tri-zip-subsystem.cut',
      title: 'Cut Y-zip hardware pieces',
      body: 'Cut the zipper gusset strip and any zipper stop reinforcement patches.',
      dependsOn: [],
      refsPieces: ['tri-zip-subsystem'],
      group: 'Zipper System',
    },
    {
      id: 'tri-zip.tri-zip-subsystem.assemble',
      title: 'Assemble Y-zip subsystem',
      body: 'Join the zipper tapes at the Y-junction. Install zipper pulls. Reinforce junction with bar tack.',
      dependsOn: ['tri-zip.tri-zip-subsystem.cut'],
      refsPieces: ['tri-zip-subsystem'],
      group: 'Zipper System',
    },
  ];
}

export function shoulderStrapSteps(): Step[] {
  return [
    {
      id: 'tri-zip.shoulder-straps.cut',
      title: 'Cut shoulder straps (pair)',
      body: 'Cut two shoulder strap panels. Cut foam padding inserts to fit.',
      dependsOn: [],
      refsPieces: ['shoulder-strap'],
      group: 'Straps',
    },
    {
      id: 'tri-zip.shoulder-straps.assemble',
      title: 'Assemble shoulder straps',
      body: 'Sandwich foam between outer and inner strap panels. Edge-stitch on all sides.',
      dependsOn: ['tri-zip.shoulder-straps.cut'],
      refsPieces: ['shoulder-strap'],
      group: 'Straps',
    },
  ];
}

export function sternumStrapSteps(): Step[] {
  return [
    {
      id: 'tri-zip.sternum-strap.cut',
      title: 'Cut sternum strap',
      body: 'Cut sternum strap webbing and slider hardware.',
      dependsOn: [],
      refsPieces: ['sternum-strap'],
      group: 'Straps',
    },
  ];
}

export function hipBeltSteps(): Step[] {
  return [
    {
      id: 'tri-zip.hip-belt.cut',
      title: 'Cut hip belt',
      body: 'Cut hip belt panels and foam padding inserts.',
      dependsOn: [],
      refsPieces: ['hip-belt'],
      group: 'Hip Belt',
    },
  ];
}

export function topHandleSteps(): Step[] {
  return [
    {
      id: 'tri-zip.top-handle.cut',
      title: 'Cut top handle',
      body: 'Cut handle panel. Fold and edge-stitch into a doubled handle.',
      dependsOn: [],
      refsPieces: ['top-handle'],
      group: 'Handles',
    },
    {
      id: 'tri-zip.top-handle.attach',
      title: 'Attach top handle to back panel',
      body: 'Box-stitch handle to back panel at the marked positions.',
      dependsOn: ['tri-zip.top-handle.cut', 'tri-zip.back-panel.cut'],
      refsPieces: ['top-handle', 'back-panel'],
      group: 'Handles',
    },
  ];
}

export function compressionStrapSteps(): Step[] {
  return [
    {
      id: 'tri-zip.compression.cut',
      title: 'Cut compression straps',
      body: 'Cut compression strap webbing and hardware as required by strap configuration.',
      dependsOn: [],
      refsPieces: ['compression-strap'],
      group: 'Compression',
    },
  ];
}

export function frameSheetSteps(): Step[] {
  return [
    {
      id: 'tri-zip.frame-sheet.cut',
      title: 'Cut frame sheet',
      body: 'Cut frame sheet to pattern piece dimensions. Round corners to fit back panel sleeve.',
      dependsOn: [],
      refsPieces: ['frame-sheet'],
      group: 'Frame',
    },
  ];
}

export function laptopSleeveSteps(): Step[] {
  return [
    {
      id: 'tri-zip.laptop-sleeve.cut',
      title: 'Cut laptop sleeve panels',
      body: 'Cut laptop sleeve front and back panels including seam allowance.',
      dependsOn: [],
      refsPieces: ['laptop-sleeve'],
      group: 'Laptop Sleeve',
    },
  ];
}

export function finalAssemblySteps(): Step[] {
  return [
    {
      id: 'tri-zip.final.join-front-back',
      title: 'Join front assembly to gusset',
      body: 'Pin the assembled front panel (center + wings) to the gusset. Clip corners. Stitch all around.',
      dependsOn: [
        'tri-zip.gusset.attach',
        'tri-zip.front-center.attach-zipper',
        'tri-zip.front-wing.attach-zipper',
      ],
      refsPieces: ['front-center-panel', 'front-wing', 'perimeter-gusset', 'back-panel'],
      group: 'Final Assembly',
    },
    {
      id: 'tri-zip.final.attach-shoulder-straps',
      title: 'Attach shoulder straps',
      body: 'Feed shoulder straps through anchor loops. Secure with bar tacks.',
      dependsOn: ['tri-zip.final.join-front-back', 'tri-zip.shoulder-straps.assemble'],
      refsPieces: ['shoulder-strap', 'back-panel'],
      group: 'Final Assembly',
    },
  ];
}
