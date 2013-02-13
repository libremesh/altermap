
AlterMap.DataGen = {

  default_coords: {
    'lat': -31.803275545018444,
    'lon': -64.43404197692871
  },

  PERSIST: false,

  _randomString: function() {
    var result = [];
    var strLength = 13;
    var charSet = 'ABCDEF0123456789';
    while (--strLength) {
      result.push(charSet.charAt(Math.floor(Math.random() * charSet.length)));
    }
    return result.join('');
  },

  _save: function(model_instance){
    if(this.PERSIST==true){
      model_instance.save()
    }
  },

  _randomCoords: function(coords) {
    var coords = coords || this.default_coords;
    var lon_str = coords.lon.toString();
    var lat_str = coords.lat.toString();
    var lon_base = lon_str.slice(0, lon_str.indexOf('.')+3);
    var lat_base = lat_str.slice(0, lat_str.indexOf('.')+3);
    var lon_variation = Math.floor(Math.random()*8999999+1000000).toString();
    var lat_variation = Math.floor(Math.random()*8999999+1000000).toString();
    var rand_lon = parseFloat(lon_base+lon_variation);
    var rand_lat = parseFloat(lat_base+lat_variation);
    var coords = {lon: rand_lon, lat: rand_lat};
    return coords
  },

  _randomSignal: function(){
    return -Math.floor(Math.random()*100)
  },

  
  randomMAC: function() {
    return this._randomString().match(/.{2}/g).join(':');
  },

  generateNetwork: function(attrs){
    attrs = attrs || {};
    var id = attrs.id || _.uniqueId('network_').toString();
    var network_name = attrs.name || this._randomString()+'Libre';
    var coords = attrs.coords || this.default_coords;
    var completed_attrs = {
      _id: id,
      name: network_name,
      coords: coords
    }
    var network = new AlterMap.Network(completed_attrs);
    this._save(network);
    return network;
  },

  generateZone: function(attrs){
    attrs = attrs || {};
    var zone_name = attrs.name || '';
    var network_id = attrs.network_id || this.generateNetwork().id;
    var zone = new AlterMap.Zone({
      _id: _.uniqueId('zone_').toString(),
      name: zone_name,
      network_id: network_id,
    });
    this._save(zone);
    return zone;
  },

  generateNode: function(attrs){
    attrs = attrs || {};
    var coords = attrs.coords || this._randomCoords();
    var node_name = attrs.name || this._randomString()+'_node';
    var zone_id = attrs.zone_id || this.generateZone().id;
    var completed_attrs = {
      _id: _.uniqueId('node_').toString(),
      name: node_name,
      coords: coords,
      elevation: 50,
      zone_id: zone_id,
    }
    var node = new AlterMap.Node(completed_attrs);
    this._save(node);
    return node;
  },

  generateDevice: function(attrs){
    attrs = attrs || {};
    var node_id = attrs.node_id || this.generateNode().id;
    var device = new AlterMap.Device({
      _id: _.uniqueId('device_').toString(),
      node_id: node_id
    });
    this._save(device);
    return device;
  },

  generateInterface: function(attrs){
    attrs = attrs || {};
    var device_id = attrs.device_id || this.generateDevice().id;
    var iface = new AlterMap.Interface({
      _id: _.uniqueId('interface_').toString(),
      name: 'wlan0',
      phydev: 'phy0',
      macaddr: this.randomMAC(),
      mode: 'adhoc',
      medium: 'wireless',
      device_id: device_id,
    });
    this._save(iface);
    return iface;
  },

  generateWifilink: function(attrs){
    if (attrs.macaddr==undefined || attrs.station==undefined){
      throw ('generateWifilink: missing macaddr or station');
    }
    if (attrs.macaddr == attrs.station){
      throw ('generateWifilink: macaddr and station cannot be the same');
    }
    var wifilink = new AlterMap.Wifilink({
      _id: _.uniqueId('wifilink_').toString(),
      macaddr: attrs.macaddr,
      station: attrs.station,
      attributes: { signal: this._randomSignal(), channel: 11 }
    });
    this._save(wifilink);
    return wifilink;
  },

  generateFixture: function(attrs){
    var node_count = attrs.node_count || 10;

    var networks = new AlterMap.NetworkCollection();
    var zones = new AlterMap.ZoneCollection();
    var nodes = new AlterMap.NodeCollection();
    var devices = new AlterMap.DeviceCollection();
    var interfaces = new AlterMap.InterfaceCollection();
    var wifilinks = new AlterMap.WifilinkCollection();

    var network = this.generateNetwork();
    var zone = this.generateZone({network_id: network.id});

    networks.add(network);
    zones.add(zone);

    for (var i=1; i<=node_count; i++){
      var node = this.generateNode({zone_id: zone.id});
      nodes.add(node);
      var device = this.generateDevice({node_id: node.id});
      devices.add(device);
      var iface = this.generateInterface({device_id: device.id})
      interfaces.add(iface);
      if (i>1){
        prev_node_id = nodes.at(i-2).id;
        prev_device_id = devices.where({node_id: prev_node_id})[0].id;
        prev_iface = interfaces.where({device_id: prev_device_id})[0];
        var wifilink = this.generateWifilink({
          macaddr: prev_iface.get('macaddr'),
          station: iface.get('macaddr')
        });
        wifilinks.add(wifilink);
      }
    }
    return {networks: networks, zones: zones, nodes: nodes, wifilinks: wifilinks};
  },

}
