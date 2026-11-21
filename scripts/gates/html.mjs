// gate:html - html-validate over the built site. Hard rules in html-validate.config.mjs fail the gate.
import { HtmlValidate } from 'html-validate/node';
import { config, HARD_RULES } from './html-validate.config.mjs';
import { Report, parseArgs, walk, rel, posix, finish, isMain } from './lib.mjs';

export async function runHtmlGate({ dist }) {
  const report = new Report('html');
  const files = walk(dist, (p) => p.endsWith('.html')).filter((p) => !posix(p).includes('/_shots/'));
  if (files.length === 0) {
    report.error({ file: rel(dist), rule: 'no-input', law: 'gate integrity', message: 'no HTML files found', what: `no *.html under ${rel(dist)}`, fix: 'Run `npm run build` first; a gate that inspects nothing must not pass.' });
    return report;
  }
  const hv = new HtmlValidate(config);
  report.note(`${files.length} pages validated`);
  for (const file of files) {
    const result = await hv.validateFile(file);
    for (const res of result.results) {
      for (const m of res.messages) {
        const hard = HARD_RULES[m.ruleId];
        const finding = { file: rel(file), line: m.line, rule: m.ruleId ?? 'parse-error', message: m.message, detail: m.message };
        if (hard) report.error({ ...finding, law: hard.law, fix: hard.fix });
        else report.warning(finding);
      }
    }
  }
  return report;
}

if (isMain(import.meta.url)) {
  const opts = parseArgs();
  finish(await runHtmlGate(opts), opts);
}
