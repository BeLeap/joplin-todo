const { registerJoplinHomeWidgetTask } = require('./src/features/widget/android-home-widget');
require('./src/features/sync/background-sync-task');

registerJoplinHomeWidgetTask();

require('expo-router/entry');
