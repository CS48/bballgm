import { PlayerGenerator } from '../lib/generators/player-generator';
import { TeamGenerator } from '../lib/generators/team-generator';

/**
 * Test script to verify the new talent distribution and team quality system
 */
async function testTalentDistribution() {
  console.log('🧪 Testing Talent Distribution System');
  console.log('=====================================\n');

  const playerGenerator = PlayerGenerator.getInstance();
  const teamGenerator = TeamGenerator.getInstance();

  // Test 1: Generate team qualities
  console.log('1. Testing Team Quality Assignment:');
  const teamQualities = teamGenerator.assignTeamQualities();

  const qualityCounts = new Map<string, number>();
  teamQualities.forEach((quality) => {
    qualityCounts.set(quality, (qualityCounts.get(quality) || 0) + 1);
  });

  console.log('Team Quality Distribution:');
  qualityCounts.forEach((count, quality) => {
    console.log(`  ${quality}: ${count} teams`);
  });
  console.log('');

  // Test 2: Generate rosters for different team qualities
  console.log('2. Testing Player Generation by Team Quality:');

  const testTeams = [
    { id: 1, quality: 'championship' },
    { id: 2, quality: 'playoff' },
    { id: 3, quality: 'mid-tier' },
    { id: 4, quality: 'rebuilding' },
    { id: 5, quality: 'lottery' },
  ];

  for (const testTeam of testTeams) {
    console.log(`\n${testTeam.quality.toUpperCase()} Team (ID: ${testTeam.id}):`);

    const roster = playerGenerator.generateRoster(testTeam.id, testTeam.quality);

    // Calculate overall ratings
    const playersWithOVR = roster.map((player) => ({
      ...player,
      ovr: playerGenerator.calculateOverallRating(player),
    }));

    // Sort by OVR
    playersWithOVR.sort((a, b) => b.ovr - a.ovr);

    // Show top 5 players
    console.log('  Top 5 Players:');
    playersWithOVR.slice(0, 5).forEach((player, index) => {
      const starter = player.is_starter ? '⭐' : '  ';
      console.log(`    ${starter} ${player.first_name} ${player.last_name} (${player.position}) - OVR: ${player.ovr}`);
    });

    // Show OVR distribution
    const ovrRanges = {
      '90+': playersWithOVR.filter((p) => p.ovr >= 90).length,
      '85-89': playersWithOVR.filter((p) => p.ovr >= 85 && p.ovr < 90).length,
      '80-84': playersWithOVR.filter((p) => p.ovr >= 80 && p.ovr < 85).length,
      '75-79': playersWithOVR.filter((p) => p.ovr >= 75 && p.ovr < 80).length,
      '70-74': playersWithOVR.filter((p) => p.ovr >= 70 && p.ovr < 75).length,
      '65-69': playersWithOVR.filter((p) => p.ovr >= 65 && p.ovr < 70).length,
      '60-64': playersWithOVR.filter((p) => p.ovr >= 60 && p.ovr < 65).length,
      '<60': playersWithOVR.filter((p) => p.ovr < 60).length,
    };

    console.log('  OVR Distribution:');
    Object.entries(ovrRanges).forEach(([range, count]) => {
      if (count > 0) {
        console.log(`    ${range}: ${count} players`);
      }
    });
  }

  // Test 3: League-wide talent distribution
  console.log('\n3. Testing League-wide Talent Distribution:');

  const allPlayers: any[] = [];
  for (let teamId = 1; teamId <= 30; teamId++) {
    const teamQuality = teamQualities.get(teamId) || 'mid-tier';
    const roster = playerGenerator.generateRoster(teamId, teamQuality);
    allPlayers.push(...roster);
  }

  const allPlayersWithOVR = allPlayers.map((player) => ({
    ...player,
    ovr: playerGenerator.calculateOverallRating(player),
  }));

  // Sort by OVR
  allPlayersWithOVR.sort((a, b) => b.ovr - a.ovr);

  console.log(`Total Players Generated: ${allPlayersWithOVR.length}`);
  console.log('\nTop 20 Players in League:');
  allPlayersWithOVR.slice(0, 20).forEach((player, index) => {
    const starter = player.is_starter ? '⭐' : '  ';
    console.log(
      `  ${(index + 1).toString().padStart(2)}. ${starter} ${player.first_name} ${player.last_name} (${player.position}) - OVR: ${player.ovr}`
    );
  });

  // League-wide OVR distribution
  const leagueOVRDistribution = {
    '95+': allPlayersWithOVR.filter((p) => p.ovr >= 95).length,
    '90-94': allPlayersWithOVR.filter((p) => p.ovr >= 90 && p.ovr < 95).length,
    '85-89': allPlayersWithOVR.filter((p) => p.ovr >= 85 && p.ovr < 90).length,
    '80-84': allPlayersWithOVR.filter((p) => p.ovr >= 80 && p.ovr < 85).length,
    '75-79': allPlayersWithOVR.filter((p) => p.ovr >= 75 && p.ovr < 80).length,
    '70-74': allPlayersWithOVR.filter((p) => p.ovr >= 70 && p.ovr < 75).length,
    '65-69': allPlayersWithOVR.filter((p) => p.ovr >= 65 && p.ovr < 70).length,
    '60-64': allPlayersWithOVR.filter((p) => p.ovr >= 60 && p.ovr < 65).length,
    '<60': allPlayersWithOVR.filter((p) => p.ovr < 60).length,
  };

  console.log('\nLeague-wide OVR Distribution:');
  Object.entries(leagueOVRDistribution).forEach(([range, count]) => {
    if (count > 0) {
      const percentage = ((count / allPlayersWithOVR.length) * 100).toFixed(1);
      console.log(`  ${range}: ${count} players (${percentage}%)`);
    }
  });

  console.log('\n✅ Talent Distribution Test Complete!');
}

// Run the test
testTalentDistribution().catch(console.error);
