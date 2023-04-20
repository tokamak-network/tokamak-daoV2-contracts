// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface ISeigManagerV2 {
    //**** onlyOwner ****//
    function setSeigPerBlock(uint256 _seigPerBlock) external;
    function setMinimumBlocksForUpdateSeig(uint32 _minimumBlocksForUpdateSeig) external;
    function setLastSeigBlock(uint256 _lastSeigBlock) external;
    function setDividendRates(uint16 _ratesDao, uint16 _ratesStosHolders, uint16 _ratesTonStakers, uint16 _ratesUnits) external;
    function setAddress(address _dao, address _stosDistribute) external;

    //**** onlyLayer2Manager or Optimism ****//
    function claim(address _to, uint256 _amount) external;

    //**** Anyone ****//
    function updateSeigniorage() external returns (bool res);
    function runUpdateSeigniorage() external returns (bool res);

    //**** View ****//
    function mintableSeigsAmount() external view returns (uint256 amount);
    function getTonToLton(uint256 _amount) external view returns (uint256 amount);
    function getLtonToTon(uint256 lton) external view returns (uint256 amount);
    function getCurrentBlockNumber() external view returns (uint256);
    function calculateIndex(uint256 curIndex, uint256 curTotal, uint256 increaseAmount)
        external pure returns (uint256 nextIndex);
    function totalSupplyTON() external view returns (uint256 amount);
    function getTotalLton() external view returns (uint256 amount);
}
