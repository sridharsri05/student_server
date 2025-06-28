const ultramsgConfig = {
    instanceId: process.env.ULTRAMSG_INSTANCE_ID,
    token: process.env.ULTRAMSG_TOKEN,
    baseUrl: process.env.ULTRAMSG_BASE_URL || 'https://api.ultramsg.com',
};

export default ultramsgConfig;
  