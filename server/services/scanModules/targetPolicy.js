const { lookup } = require("dns").promises;
const { BlockList, isIP } = require("net");
const http = require("http");
const https = require("https");

const blockedAddresses = new BlockList();

[
  ["0.0.0.0", 8, "ipv4"],
  ["10.0.0.0", 8, "ipv4"],
  ["100.64.0.0", 10, "ipv4"],
  ["127.0.0.0", 8, "ipv4"],
  ["169.254.0.0", 16, "ipv4"],
  ["172.16.0.0", 12, "ipv4"],
  ["192.0.0.0", 24, "ipv4"],
  ["192.0.2.0", 24, "ipv4"],
  ["192.88.99.0", 24, "ipv4"],
  ["192.168.0.0", 16, "ipv4"],
  ["198.18.0.0", 15, "ipv4"],
  ["198.51.100.0", 24, "ipv4"],
  ["203.0.113.0", 24, "ipv4"],
  ["224.0.0.0", 4, "ipv4"],
  ["240.0.0.0", 4, "ipv4"],
  ["::", 96, "ipv6"],
  ["::ffff:0:0", 96, "ipv6"],
  ["64:ff9b::", 96, "ipv6"],
  ["2001:db8::", 32, "ipv6"],
  ["2002::", 16, "ipv6"],
  ["fc00::", 7, "ipv6"],
  ["fe80::", 10, "ipv6"],
  ["ff00::", 8, "ipv6"],
].forEach(([subnet, prefix, family]) => {
  blockedAddresses.addSubnet(subnet, prefix, family);
});

const isBlockedAddress = (address) => {
  const family = isIP(address);
  return !family || blockedAddresses.check(address, family === 4 ? "ipv4" : "ipv6");
};

const createTargetAgent = async (url) => {
  if (process.env.NODE_ENV !== "production") return null;

  const hostname = new URL(url).hostname.replace(/^\[|\]$/g, "");
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error("Scan target must resolve only to public IP addresses in production");
  }

  const pinnedLookup = (requestedHostname, options, callback) => {
    if (requestedHostname !== hostname) {
      return callback(new Error("Unexpected hostname during scan request"));
    }
    if (options?.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  };

  const Agent = new URL(url).protocol === "https:" ? https.Agent : http.Agent;
  return new Agent({ lookup: pinnedLookup, keepAlive: false });
};

module.exports = { createTargetAgent };
