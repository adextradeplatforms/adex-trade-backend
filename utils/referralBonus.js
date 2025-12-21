export const referralPercents = [0.08, 0.06, 0.04, 0.02, 0.01];

export async function distributeReferralBonus(user, amount) {
  let currentUser = user;

  for (let level = 0; level < referralPercents.length; level++) {
    if (!currentUser.referrer) break;

    const referrer = await User.findById(currentUser.referrer);
    if (!referrer) break;

    const bonus = amount * referralPercents[level];
    referrer.balance += bonus;
    await referrer.save();

    currentUser = referrer;
  }
}
