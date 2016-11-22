const execute = require('../index.js');
const chai = require('chai');
chai.use(require('sinon-chai'));
const expect = chai.expect;
const sinon = require('sinon');

describe('test', () => {

  describe('getArguments', () => {
    it('should work for shorthand', () => {
      const z = {
        shortand(one, two) {
        }
      };

      expect(execute.getArguments(z.shortand)).to.deep.equal(['one', 'two']);
    });

    it('should work for anon function', () => {
      expect(execute.getArguments(function(one, two) {})).to.deep.equal(['one', 'two']);
    });

    it('should work for named function', () => {
      expect(execute.getArguments(function zork(one, two) {})).to.deep.equal(['one', 'two']);
    });

    it('should work for empty function', () => {
      expect(execute.getArguments(() => {})).to.deep.equal([]);
    });

    it('should work for one argument', () => {
      expect(execute.getArguments((one) => {})).to.deep.equal(['one']);
    });

    it('should work for two arguments', () => {
      expect(execute.getArguments((one, two) => {})).to.deep.equal(['one', 'two']);
    });

    it('should work with commenst', () => {
      expect(execute.getArguments((/*test*/one/*onethertest*/, /*more tste*/two/*osuothuo*/) => {})).to.deep.equal(['one', 'two']);
    });

    it('should work with commenst 2', () => {
      expect(execute.getArguments((/*test***/) => {})).to.deep.equal([]);
    });
  });

  it('should find dead-end', (done) => {
    return done();
  });

  describe('buildMap', () => {
    it('should build tree', () => {
        expect(execute.buildMap({
          user() {},
          profile(user) {},
          bankAccount(profile, language) {},
          language(city, profile) {},
          city() {},
          everything(user, profile, bankAccount, language) {}
        })).to.deep.equal({
          user: { dependencies: [] },
          profile: { dependencies: ['user'] },
          bankAccount: { dependencies: ['profile'] },
          language: { dependencies: ['city', 'profile'] },
          city: { dependencies: [] },
          everything: { dependencies: ['user', 'profile', 'bankAccount', 'language' ] }
        });
    });

    it('should stop building when function is absent', () => {
        expect(() => execute.buildMap({
          user() {},
          profile(user) {},
          bankAccount(profile) {},
          language(user, profile) {},
          everything(user, address, profile, bankAccount, language) {}
        })).to.throw('"address" is not found');
    });

    it('should break when loop is found', () => {
        expect(() => execute.buildMap({
          city() {},
          address(city) {},
          language(bankAccount) {},
          bankAccount(profile) {},
          profile(user, address) {},
          user(language) {}
        })).to.throw('Found circular reference: language > bankAccount > profile > user')
    });
  });

  it('should run series', (done) => {
    const flow = {
      user() {
        return 'user';
      },

      city() {
        return 'city';
      },

      asyncCall(callback) {
        setTimeout(() => {
          callback(null, 'asyncCall');
        }, 10);
      },

      bankAccount(user, city) {
        return Promise.resolve({
          user,
          city
        });
      },

      all(bankAccount, city, user, asyncCall) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve({
              bankAccount,
              city,
              user,
              asyncCall
            });
          }, 1000);
        });
      }
    };

    execute(flow, (all) => {
      expect(all).to.deep.equal({
        bankAccount: {
          user: 'user',
          city: 'city'
        },
        city: 'city',
        user: 'user',
        asyncCall: 'asyncCall'
      });

      return done();
    });

  });
});
