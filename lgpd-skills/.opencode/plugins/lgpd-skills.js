/**
 * lgpd-skills plugin for OpenCode.ai
 *
 * Registra o diretório skills/ do repo para que o OpenCode descubra as skills
 * de LGPD. Sem injeção de bootstrap: as skills são acionadas sob demanda via a
 * ferramenta nativa `skill` do OpenCode.
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const LgpdSkillsPlugin = async () => {
  const skillsDir = path.resolve(__dirname, '../../skills');
  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir);
      }
    }
  };
};
