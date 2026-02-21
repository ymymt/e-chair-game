import React from 'react';

var RoundStatus = React.createClass({
  render: function() {
    var props = this.props;
    var round = props.round;
    var userId = props.userId;
    return (
      <div className="text-center text-lg">
        {round && round.count}回 {round && round.turn === 'top' ? '表' : '裏'}
        <div>
          {round && round.attackerId === userId
            ? '攻撃ターン：電気椅子を避けて座れ！'
            : '守備ターン：電気椅子に座らせろ！'}
        </div>
      </div>
    );
  }
});

export { RoundStatus };
