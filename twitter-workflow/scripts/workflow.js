const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  skillsDir: '/Users/douba/.claude/skills',
  outputDir: '/Users/douba/twitter-output',
  defaultPreset: 'nano-banana-pro',
  stages: {
    collector: 'twitter-collector',
    grok: 'grok-json-generator',
    importer: 'db-importer'
  }
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 执行: node ${cmd} ${args.join(' ')}`);
    const process = spawn('node', [cmd, ...args], { cwd, shell: false });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data;
    });
    
    process.stderr.on('data', (data) => {
      stderr += data;
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(stdout);
        resolve({ code, stdout, stderr });
      } else {
        console.error(`❌ 执行失败: ${stderr}`);
        reject(new Error(`命令执行失败，退出码: ${code}`));
      }
    });
  });
}

async function runCollector(config) {
  const preset = config.preset || CONFIG.defaultPreset;
  const args = ['--preset', preset, '--output', 'preview'];
  
  if (config.outputDir) {
    args.push('--output-dir', config.outputDir);
  }
  
  await runCommand('scripts/collector.js', args, path.join(CONFIG.skillsDir, 'twitter-collector'));
}

async function runGrokGenerator(config) {
  const args = [];
  
  if (config.linksFile) {
    args.push('--input-file', config.linksFile);
  }
  
  if (config.outputDir) {
    args.push('--output-dir', config.outputDir);
  }
  
  await runCommand('scripts/grok-generator.js', args, path.join(CONFIG.skillsDir, 'grok-json-generator'));
}

async function runImporter(config) {
  const args = ['--input-file', path.join(config.outputDir, 'grok-data.json')];
  
  if (config.outputDir) {
    args.push('--output-dir', config.outputDir);
  }
  
  if (config.startIndex !== undefined) {
    args.push('--start-index', config.startIndex);
  }
  
  await runCommand('scripts/importer.js', args, path.join(CONFIG.skillsDir, 'db-importer'));
}

async function saveWorkflowStatus(status, config) {
  const statusData = {
    stage: status,
    completed_at: new Date().toISOString(),
    config: {
      preset: config.preset || CONFIG.defaultPreset,
      outputDir: config.outputDir
    }
  };
  
  const filePath = path.join(config.outputDir, 'workflow-status.json');
  fs.writeFileSync(filePath, JSON.stringify(statusData, null, 2));
  console.log(`📊 工作流状态已保存: ${filePath}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...CONFIG };
  
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--stage':
        config.stage = nextArg;
        i += 1;
        break;
      case '--preset':
        config.preset = nextArg;
        i += 1;
        break;
      case '--links-file':
        config.linksFile = nextArg;
        i += 1;
        break;
      case '--start-index':
        config.startIndex = parseInt(nextArg, 10);
        i += 1;
        break;
      case '--output-dir':
        config.outputDir = nextArg;
        i += 1;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  return config;
}

function showHelp() {
  console.log(`
🔄 Twitter 完整工作流

使用方式:
  node scripts/workflow.js [选项]

选项:
  --stage <阶段>      执行阶段
    可选值: all, collector, grok, import
  --preset <预设>      采集预设 (默认: nano-banana-pro)
  --links-file <文件>   链接文件路径
  --start-index <数字>  起始索引 (默认: 0)
  --output-dir <目录>   输出目录 (默认: /Users/douba/twitter-output)

示例:
  # 完整流程
  node scripts/workflow.js --stage all --preset nano-banana-pro

  # 只采集
  node scripts/workflow.js --stage collector --preset nano-banana-pro

  # 只 Grok 转换
  node scripts/workflow.js --stage grok --links-file /Users/douba/twitter-output/twitter-links-2026-01-13.txt

  # 只导入
  node scripts/workflow.js --stage import
`);
}

async function main() {
  console.log('🔄 Twitter 完整工作流启动...\n');
  
  const config = parseArgs();
  ensureDir(config.outputDir);
  
  try {
    if (config.stage === 'all' || !config.stage) {
      console.log('📋 执行完整流程...\n');
      await saveWorkflowStatus('started', config);
      
      await runCollector(config);
      await runGrokGenerator(config);
      await runImporter(config);
      
      await saveWorkflowStatus('completed', config);
      
      console.log('\n🎉 完整流程执行完成！');
    } else if (config.stage === 'collector') {
      console.log('📋 执行采集阶段...\n');
      await runCollector(config);
      console.log('✅ 采集阶段完成');
    } else if (config.stage === 'grok') {
      console.log('📋 执行 Grok 转换阶段...\n');
      await runGrokGenerator(config);
      console.log('✅ Grok 转换阶段完成');
    } else if (config.stage === 'import') {
      console.log('📋 执行数据库录入阶段...\n');
      await runImporter(config);
      console.log('✅ 数据库录入阶段完成');
    }
  } catch (error) {
    console.error(`\n❌ 执行失败: ${error.message}`);
    console.error(error.stack);
    await saveWorkflowStatus('failed', config);
    process.exit(1);
  }
}

main();
