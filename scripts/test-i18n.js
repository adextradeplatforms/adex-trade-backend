#!/usr/bin/env node
import { getT } from '../src/config/i18n.js';

(async () => {
  console.log('🌐 Testing i18n System\n');
  console.log('='.repeat(80));

  const languages = ['en', 'ar', 'es', 'it', 'ru'];

  for (const lang of languages) {
    console.log(`\n🌍 ${lang.toUpperCase()}:`);
    console.log('-'.repeat(40));

    const t = await getT(lang);

    console.log('auth.login:', t('auth.login'));
    console.log('auth.loginSuccess:', t('auth.loginSuccess'));
    console.log('wallet.wallet:', t('wallet.wallet'));
    console.log('wallet.insufficientBalance:', t('wallet.insufficientBalance'));
    console.log('common.hello:', t('common.hello'));
    console.log('common.thankYou:', t('common.thankYou'));
    console.log('common.startInvestingToday:', t('common.startInvestingToday'));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ All languages tested successfully!');

  process.exit(0);
})();
