const { ZipArchive } = require('archiver');
const fs = require('fs');
const path = require('path');

const PCB_DIR = path.join(__dirname, 'storage', 'pcb');
fs.mkdirSync(PCB_DIR, { recursive: true });

const safeProjectName = 'test';
const timeMark = Date.now();

const schematicContent = '(kicad_sch ...)\n';
const layoutContent = '(kicad_pcb ...)\n';
const projectContent = '{"project": {}}\n';
const bomContent = '"Reference"\n';
const gbrHeader = 'GBR\n';
const drlHeader = 'DRL\n';

async function test() {
    console.log("Start test...");
    // Gerber Zip packaging
    const gerberZipName = `Gerber_${safeProjectName}_${timeMark}.zip`;
    const gerberZipPath = path.join(PCB_DIR, gerberZipName);
    const gerberZipStream = fs.createWriteStream(gerberZipPath);
    const gerberArchive = new ZipArchive({ zlib: { level: 9 } });
    
    gerberArchive.on('error', err => console.log('gerberArchive error:', err));
    gerberZipStream.on('error', err => console.log('gerberZipStream error:', err));
    
    gerberArchive.pipe(gerberZipStream);

    gerberArchive.append(gbrHeader, { name: `${safeProjectName}_TopCopper.gbr` });
    gerberArchive.append(gbrHeader, { name: `${safeProjectName}_BottomCopper.gbr` });
    await gerberArchive.finalize();
    console.log("Gerber archive finalized!");

    // KiCad Project ZIP packaging
    const kicadZipName = `KiCadProject_${safeProjectName}_${timeMark}.zip`;
    const kicadZipPath = path.join(PCB_DIR, kicadZipName);
    const kicadZipStream = fs.createWriteStream(kicadZipPath);
    const kicadArchive = new ZipArchive({ zlib: { level: 9 } });
    
    kicadArchive.on('error', err => console.log('kicadArchive error:', err));
    kicadZipStream.on('error', err => console.log('kicadZipStream error:', err));
    
    kicadArchive.pipe(kicadZipStream);

    kicadArchive.append(schematicContent, { name: `${safeProjectName}/${safeProjectName}.kicad_sch` });
    kicadArchive.append(layoutContent, { name: `${safeProjectName}/${safeProjectName}.kicad_pcb` });
    kicadArchive.append(projectContent, { name: `${safeProjectName}/${safeProjectName}.kicad_pro` });
    kicadArchive.append(bomContent, { name: `${safeProjectName}/${safeProjectName}_BOM.csv` });
    await kicadArchive.finalize();
    console.log("KiCad archive finalized!");

    console.log("Waiting for streams to close...");
    
    const p1 = new Promise((res) => {
      gerberZipStream.on('close', () => { console.log('gerber closed'); res(); });
      gerberZipStream.on('finish', () => { console.log('gerber finished'); res(); });
    });
    const p2 = new Promise((res) => {
      kicadZipStream.on('close', () => { console.log('kicad closed'); res(); });
      kicadZipStream.on('finish', () => { console.log('kicad finished'); res(); });
    });
    
    await Promise.all([p1, p2]);
    console.log("Streams closed successfully!");
}

test().catch(console.error);
