async function postJson(url, body) {
  var response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  var data = await response.json();
  return data;
}

function createRoomApi() {
  return postJson('/api/room/create');
}

function joinRoomApi(roomId) {
  return postJson('/api/room/join', { roomId: roomId });
}

function selectChairApi(data) {
  return postJson('/api/room/select-chair', data);
}

function activateApi(roomId) {
  return postJson('/api/room/activate', { roomId: roomId });
}

function changeTurnApi(data) {
  return postJson('/api/room/change-turn', data);
}

module.exports = {
  createRoomApi: createRoomApi,
  joinRoomApi: joinRoomApi,
  selectChairApi: selectChairApi,
  activateApi: activateApi,
  changeTurnApi: changeTurnApi,
};
