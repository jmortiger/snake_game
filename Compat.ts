enum Environment {
  basic,
  integrated,
}

/** Smooths over differences between test & deployment. */
export default class Compat {
  public static environment = Environment.basic;

  public static get rootPath() {
    switch (this.environment) {
      case Environment.basic:
        return "./assets";
      case Environment.integrated:
        return "/images/snake";
    }
  }
}
