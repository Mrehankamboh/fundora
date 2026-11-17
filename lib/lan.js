const os = require("os");

function lanAddresses() {
  const list = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets || {})) {
    for (const net of nets[name] || []) {
      const family = String(net.family);
      if ((family === "IPv4" || family === "4") && !net.internal) {
        if (String(net.address).startsWith("169.254.")) continue;
        list.push(net.address);
      }
    }
  }
  return [...new Set(list)].sort((a, b) => {
    const rank = (ip) => {
      if (ip.startsWith("192.168.137.") || ip.startsWith("172.")) return 2;
      if (ip.startsWith("192.168.") || ip.startsWith("10.")) return 0;
      return 1;
    };
    return rank(a) - rank(b) || a.localeCompare(b);
  });
}

function lanOrigin(port) {
  const ip = lanAddresses()[0];
  if (!ip) return "";
  return "http://" + ip + ":" + port;
}

module.exports = { lanAddresses, lanOrigin };
