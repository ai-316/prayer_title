/**
 * 안드로이드 설정 보완
 *  - 세로 화면 고정
 *  - 다른 앱에 파일을 보낼 수 있도록 권한 추가
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const MANIFEST = 'android/app/src/main/AndroidManifest.xml'

if (!existsSync(MANIFEST)) {
  console.error('❌ android 프로젝트를 찾을 수 없습니다.')
  process.exit(1)
}

let xml = readFileSync(MANIFEST, 'utf8')

/* 1) 세로 화면 고정 */
if (xml.includes('android:screenOrientation')) {
  console.log('ℹ️  화면 방향이 이미 설정되어 있습니다.')
} else {
  xml = xml.replace(
    /(<activity\b[^>]*android:name="\.MainActivity")/,
    '$1\n            android:screenOrientation="portrait"',
  )
  console.log('✅ 세로 화면 고정')
}

/* 2) 파일 관련 권한 (구형 안드로이드 대응) */
const PERMS = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
]
const missing = PERMS.filter((p) => !xml.includes(p))
if (missing.length > 0) {
  const block =
    missing
      .map(
        (p) =>
          `    <uses-permission android:name="${p}" android:maxSdkVersion="32" />`,
      )
      .join('\n') + '\n\n'
  xml = xml.replace(/<manifest[^>]*>/, (m) => `${m}\n${block}`)
  console.log(`✅ 저장 권한 ${missing.length}개 추가`)
} else {
  console.log('ℹ️  저장 권한이 이미 있습니다.')
}

writeFileSync(MANIFEST, xml, 'utf8')
console.log('🎉 안드로이드 설정 완료')
