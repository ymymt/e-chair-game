var plainRoundData = {
  round: {
    count: 1,
    turn: 'top',
    attackerId: '',
    phase: 'setting',
    electricChair: null,
    seatedChair: null,
    result: {
      status: null,
      confirmedIds: [],
      shownResult: false,
    },
  },
};

var isSuccessfulGetRoomResponse = function(room) {
  return room.status === 200;
};

module.exports = {
  plainRoundData: plainRoundData,
  isSuccessfulGetRoomResponse: isSuccessfulGetRoomResponse,
};
